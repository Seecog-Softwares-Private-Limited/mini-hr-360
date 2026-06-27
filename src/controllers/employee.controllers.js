// src/controllers/employee.controllers.js
import { Op } from 'sequelize';
import { sequelize } from '../db/index.js';
import Employee from '../models/Employee.js';
import EmployeeEducation from '../models/EmployeeEducation.js';
import EmployeeExperience from '../models/EmployeeExperience.js';
import EmployeeDocument from '../models/EmployeeDocument.js';
import { Department } from '../models/Department.js';
import { Designation } from '../models/Designation.js';
import { Business } from '../models/Business.js';
import { OrganizationMember } from '../models/OrganizationMember.js';
import { User } from '../models/User.js';
import BusinessAddress from '../models/BusinessAddress.js';
import Country from '../models/Country.js';
import State from '../models/State.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getEffectiveAssignment } from '../services/attendance.service.js';
import { generatePassword } from '../utils/passwordGenerator.js';
import { sendDocumentEmail } from '../utils/emailService.js';
import { resolveOrganizationIdFromRequest, userBelongsToOrganization } from '../services/organization.service.js';
import { LIFECYCLE_STAGE_LABELS } from '../config/lifecycleWorkflows.js';

const LIFECYCLE_BADGE_CLASS = {
  prospect: 'secondary',
  offer: 'info',
  joining: 'primary',
  active: 'success',
  confirmed: 'success',
  offboarding: 'warning',
  exited: 'dark',
};

const toBool = (val) =>
    val === true || val === 'true' || val === '1' || val === 'on';

const isBlank = (value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    return false;
};

const strOrDefault = (value, fallback) => {
    if (isBlank(value)) return fallback;
    return String(value).trim();
};

const todayDateOnly = () => new Date().toISOString().slice(0, 10);

const draftEmployeeEmail = (organizationId) =>
    `draft.${organizationId}.${Date.now()}@draft.mini-hr-360.local`;

const normalizePhone = (value, fallback = '0000000000') => {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length === 10 ? digits : fallback;
};

function mergeEmployeeField(body, existing, key, defaultValue) {
    const raw = body[key];
    if (!isBlank(raw)) {
        return typeof raw === 'string' ? raw.trim() : raw;
    }
    const current = existing?.[key];
    if (!isBlank(current)) return current;
    return defaultValue;
}

const EMPLOYEE_TYPES = new Set(['Permanent', 'Contract', 'Intern', 'Consultant', 'Trainee']);

const normalizeEmployeeType = (value, fallback = 'Permanent') => {
    const normalized = strOrDefault(value, fallback);
    return EMPLOYEE_TYPES.has(normalized) ? normalized : fallback;
};

/** Phase 6: contract / intern field rules */
function validateEmployeeTypeFields(body, employeeType) {
    const type = normalizeEmployeeType(employeeType || body.employeeType || 'Permanent');
    const contractEnd = body.contractEndDate?.trim?.() || body.contractEndDate || null;

    if ((type === 'Contract' || type === 'Consultant') && !contractEnd) {
        return 'Contract end date is required for Contract and Consultant employees';
    }

    if (type === 'Intern') {
        const stipend = isBlank(body.internStipend) ? 0 : Number(body.internStipend);
        const ctc = isBlank(body.empCtc) ? 0 : Number(body.empCtc);
        if (stipend < 0 || ctc < 0) {
            return 'Stipend and CTC cannot be negative for interns';
        }
    }

    return null;
}

function parseReportingManagerId(raw) {
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
}

async function assertReportingManagerForEmployee({ employeeId = null, businessId, reportingManagerId }) {
    const managerId = parseReportingManagerId(reportingManagerId);
    if (!managerId) {
        const err = new Error('Reporting manager is required for every employee');
        err.statusCode = 400;
        throw err;
    }

    if (employeeId && managerId === Number(employeeId)) {
        const err = new Error('An employee cannot be their own reporting manager');
        err.statusCode = 400;
        throw err;
    }

    const manager = await Employee.findOne({
        where: {
            id: managerId,
            businessId: Number(businessId),
            isActive: true,
        },
        attributes: ['id'],
    });

    if (!manager) {
        const err = new Error('Selected reporting manager is invalid or not in this organization');
        err.statusCode = 400;
        throw err;
    }

    return managerId;
}

const isAdminUser = (user) => String(user?.role || '').toLowerCase() === 'admin';
const HR_DEFAULT_PASSWORD_PREFIX = 'hr_default_pwd:';

function getPasswordCryptoKey() {
    const secret = String(
        process.env.HR_PASSWORD_ENCRYPTION_KEY ||
        process.env.JWT_SECRET ||
        process.env.ACCESS_TOKEN_SECRET ||
        ''
    ).trim();
    if (!secret) return null;
    return crypto.createHash('sha256').update(secret).digest();
}

function encodeHrDefaultPasswordToken(plainPassword) {
    if (!plainPassword) return null;
    const key = getPasswordCryptoKey();
    if (!key) return null;

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plainPassword, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${HR_DEFAULT_PASSWORD_PREFIX}${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

function decodeHrDefaultPasswordToken(token) {
    if (!token || !String(token).startsWith(HR_DEFAULT_PASSWORD_PREFIX)) return null;
    const key = getPasswordCryptoKey();
    if (!key) return null;

    try {
        const payload = String(token).slice(HR_DEFAULT_PASSWORD_PREFIX.length);
        const [ivB64, tagB64, encryptedB64] = payload.split('.');
        if (!ivB64 || !tagB64 || !encryptedB64) return null;

        const iv = Buffer.from(ivB64, 'base64');
        const tag = Buffer.from(tagB64, 'base64');
        const encrypted = Buffer.from(encryptedB64, 'base64');

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (err) {
        console.error('Failed to decrypt HR default password token:', err?.message || err);
        return null;
    }
}

async function buildPendingInvitedMembers(organizationId, existingEmployees = []) {
    if (!organizationId) return [];

    const memberRows = await OrganizationMember.findAll({
        where: { businessId: Number(organizationId), status: 'active' },
        include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'status'] }],
        attributes: ['userId', 'role', 'status'],
        order: [['createdAt', 'ASC']],
    });

    const existingEmails = new Set(
        existingEmployees
            .map((e) => String(e?.empEmail || '').trim().toLowerCase())
            .filter(Boolean)
    );

    const pending = [];
    for (const row of memberRows) {
        const user = row.user;
        if (!user?.email) continue;

        const email = String(user.email).trim().toLowerCase();
        if (existingEmails.has(email)) continue;

        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        pending.push({
            id: `member-${user.id}`,
            empId: 'INVITED',
            empName: fullName,
            empEmail: user.email,
            empPhone: '—',
            empDesignation: 'Pending profile',
            empDepartment: row.role || 'EMPLOYEE',
            empDateOfJoining: '—',
            initial: fullName.charAt(0).toUpperCase(),
            shiftName: null,
            shiftStartTime: null,
            shiftEndTime: null,
            isInvitedMember: true,
            invitedRole: row.role || 'EMPLOYEE',
            memberStatus: row.status || 'active',
        });
    }

    return pending;
}

/**
 * Generate welcome email HTML template
 */
function generateWelcomeEmailHTML(employee, password, loginUrl) {
    const portalLoginUrl = loginUrl || '/employee/login';
    const employeeName = employee.empName || `${employee.firstName} ${employee.lastName}`.trim();

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .credentials-box {
            background: white;
            border: 2px solid #6366f1;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .credential-item {
            margin: 15px 0;
            padding: 10px;
            background: #f3f4f6;
            border-radius: 5px;
        }
        .credential-label {
            font-weight: bold;
            color: #6366f1;
            display: block;
            margin-bottom: 5px;
        }
        .credential-value {
            font-family: monospace;
            font-size: 16px;
            color: #1f2937;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            margin: 20px 0;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 12px;
        }
        .warning {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome to Mini HR 360!</h1>
    </div>
    <div class="content">
        <p>Dear ${employeeName},</p>
        
        <p>Welcome to our organization! Your employee account has been created successfully.</p>
        
        <p>You can now access your employee dashboard using the credentials below:</p>
        
        <div class="credentials-box">
            <div class="credential-item">
                <span class="credential-label">Login URL:</span>
                <span class="credential-value">${portalLoginUrl}</span>
            </div>
            <div class="credential-item">
                <span class="credential-label">Email / Employee Code:</span>
                <span class="credential-value">${employee.empEmail}${employee.empId ? ` or ${employee.empId}` : ''}</span>
            </div>
            <div class="credential-item">
                <span class="credential-label">Password:</span>
                <span class="credential-value">${password}</span>
            </div>
        </div>
        
        <div style="text-align: center;">
            <a href="${portalLoginUrl}" class="button">Login to Dashboard</a>
        </div>
        
        <div class="warning">
            <strong>⚠️ Security Notice:</strong> Please change your password after your first login for security purposes.
        </div>
        
        <p>If you have any questions or need assistance, please contact your HR department.</p>
        
        <p>Best regards,<br>
        <strong>HR Team</strong><br>
        Mini HR 360</p>
    </div>
    <div class="footer">
        <p>This is an automated email. Please do not reply to this message.</p>
        <p>&copy; ${new Date().getFullYear()} Mini HR 360. All rights reserved.</p>
    </div>
</body>
</html>
    `;
}

/**
 * Send welcome email to new employee
 */
async function sendWelcomeEmail(employee, password, portalUrl) {
    if (!employee.empEmail) {
        const message = 'Employee email is missing';
        console.warn(`Cannot send welcome email: ${message}`);
        return { sent: false, error: message };
    }

    const loginUrl = portalUrl || '/employee/login';
    const subject = `Welcome to Mini HR 360 - Your Employee Portal Login`;
    const html = generateWelcomeEmailHTML(employee, password, loginUrl);

    try {
        const result = await sendDocumentEmail({
            to: employee.empEmail,
            subject: subject,
            html: html,
        });

        if (result.success) {
            console.log(`Welcome email sent successfully to ${employee.empEmail}`);
            return { sent: true };
        }

        console.error(`Failed to send welcome email to ${employee.empEmail}:`, result.error);
        return { sent: false, error: result.error || 'Email delivery failed' };
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return { sent: false, error: error?.message || 'Email delivery failed' };
    }
}

function getPortalLoginUrl(req) {
    return `${req.protocol}://${req.get('host')}/employee/login`;
}

function sanitizeEmployeeJson(employee) {
    const json = employee.toJSON ? employee.toJSON() : { ...employee };
    delete json.password;
    delete json.employeeRefreshToken;
    delete json.employeeRefreshTokenExpiresAt;
    delete json.resetPasswordToken;
    delete json.resetPasswordExpires;
    return json;
}

function buildPortalAccess(employee, plainPassword, req, emailSent = false, emailError = null) {
    const savedDefaultPassword = decodeHrDefaultPasswordToken(employee?.resetPasswordToken);
    return {
        enabled: true,
        canLogin: !!employee?.canLogin,
        loginEmail: employee.empEmail,
        loginEmployeeCode: employee.empId,
        password: plainPassword || null,
        portalUrl: getPortalLoginUrl(req),
        instructions: 'Sign in at the employee portal using the email or employee code with the password below.',
        emailSent: !!emailSent,
        emailError: emailSent ? null : (emailError || null),
        hasHrVisibleDefaultPassword: !!savedDefaultPassword,
        hrVisibleDefaultPassword: savedDefaultPassword,
    };
}

// Legacy installs often have employees created without correct userId tenancy.
// We only relax scoping when the employees table effectively has a single tenant.
const isLegacySingleTenantEmployees = async () => {
    try {
        // DISTINCT userId count (null counts as a single distinct value)
        const distinctUserIds = await Employee.count({ distinct: true, col: 'userId' });
        return distinctUserIds <= 1;
    } catch (e) {
        // Be safe: if this check fails, do NOT relax scoping
        return false;
    }
};

/**
 * GET /employees (HTML page)
 */
export const renderEmployeesPage = async (req, res, next) => {
    try {
        const search = (req.query.search || '').trim();
        const lifecycleFilter = (req.query.lifecycleStage || '').trim();
        const userId = req.user?.id;
        const isAdmin = isAdminUser(req.user);
        const organizationId = await resolveOrganizationIdFromRequest(req);
        const where = {};

        // Non-admin users should only see employees in the active organization.
        if (!isAdmin && !organizationId) {
            const user = req.user
                ? { firstName: req.user.firstName, lastName: req.user.lastName, role: req.user.role }
                : {};

            return res.render('employees', {
                layout: 'main',
                title: 'Employee Management',
                user,
                active: 'employees',
                activeGroup: 'workspace',
                employees: [],
                departments: [],
                designations: [],
                businesses: [],
                businessAddresses: [],
                countries: [],
                states: [],
                search,
                lifecycleStage: lifecycleFilter,
            });
        }

        if (!isAdmin && organizationId) {
            where.businessId = Number(organizationId);
        } else if (userId && !isAdmin) {
            where.userId = userId;
        }

        if (search) {
            where[Op.or] = [
                { empName: { [Op.like]: `%${search}%` } },
                { empEmail: { [Op.like]: `%${search}%` } },
                { empId: { [Op.like]: `%${search}%` } },
            ];
        }

        if (lifecycleFilter) {
            where.lifecycleStage = lifecycleFilter;
        }

        let employeesPromise = Employee.findAll({
            where,
            order: [['empId', 'ASC']],
        });

        const [employeesInitial, departments, designations, businesses, business_addresses, countries, states] = await Promise.all([
            employeesPromise,
            Department.findAll({
                where: { status: 'ACTIVE' },
                order: [['name', 'ASC']],
            }),
            Designation.findAll({
                where: { status: 'ACTIVE' },
                order: [['name', 'ASC']],
            }),
            Business.findAll({
                where: userId && !isAdmin ? { ownerId: userId } : {},
                order: [['businessName', 'ASC']],
            }),
            BusinessAddress.findAll({
                where: { status: 'ACTIVE' },
                order: [['addressName', 'ASC']],
            }),
            Country.findAll({
                where: { status: 'ACTIVE' },
                order: [['name', 'ASC']],
            }),
            State.findAll({
                where: { status: 'ACTIVE' },
                order: [['name', 'ASC']],
            }),
        ]);

        // Legacy fallback: only for strict userId scoping mode.
        let employees = employeesInitial;
        if (!isAdmin && userId && !organizationId && employees.length === 0) {
            const legacy = await isLegacySingleTenantEmployees();
            if (legacy) {
                const legacyWhere = { ...where };
                delete legacyWhere.userId;
                employees = await Employee.findAll({
                    where: legacyWhere,
                    order: [['empId', 'ASC']],
                });
            }
        }

        // const departments = await Department.findAll();
        console.log("departments data : ", departments)

        console.log("employees data : ", employees)

        const employeesPlain = employees.map((e) => e.get({ plain: true }));
        const departmentsPlain = departments.map((d) => d.get({ plain: true }));
        const designationsPlain = designations.map((d) => d.get({ plain: true }));
        const businessesPlain = businesses.map((b) => b.get({ plain: true }));
        const businessAddressesPlain = business_addresses.map((b) => b.get({ plain: true }));
        const countriesPlain = countries.map((c) => c.get({ plain: true }));
        const statesPlain = states.map((s) => s.get({ plain: true }));

        console.log('Employees fetched for page');

        // Attach current effective shift (if any) for each employee (for today's date)
        const todayStr = new Date().toISOString().split('T')[0];
        await Promise.all(employeesPlain.map(async (emp) => {
            try {
                emp.initial = emp.empName ? String(emp.empName).charAt(0).toUpperCase() : '';
                emp.lifecycleStageLabel = LIFECYCLE_STAGE_LABELS[emp.lifecycleStage] || emp.lifecycleStage || 'prospect';
                emp.lifecycleBadgeClass = LIFECYCLE_BADGE_CLASS[emp.lifecycleStage] || 'secondary';
                const assignment = await getEffectiveAssignment({ businessId: emp.businessId, employeeId: emp.id, date: todayStr });
                if (assignment && assignment.shift) {
                    emp.shiftName = assignment.shift.name;
                    emp.shiftStartTime = assignment.shift.startTime;
                    emp.shiftEndTime = assignment.shift.endTime;
                } else {
                    emp.shiftName = null;
                    emp.shiftStartTime = null;
                    emp.shiftEndTime = null;
                }
            } catch (e) {
                emp.shiftName = null;
                emp.shiftStartTime = null;
                emp.shiftEndTime = null;
            }
        }));

        const pendingMembers = !isAdmin && organizationId
            ? await buildPendingInvitedMembers(organizationId, employeesPlain)
            : [];
        const employeeRows = [...pendingMembers, ...employeesPlain];

        const user = req.user
            ? { firstName: req.user.firstName, lastName: req.user.lastName }
            : {};

        res.render('employees', {//loading the employees.hbs
            layout: 'main',
            title: 'Employee Management',
            user,
            active: 'employees',
            activeGroup: 'workspace',
            employees: employeeRows,
            departments: departmentsPlain,
            designations: designationsPlain,
            businesses: businessesPlain,
            businessAddresses: businessAddressesPlain,
            countries: countriesPlain,
            states: statesPlain,
            search,
            lifecycleStage: lifecycleFilter,
        });
    } catch (err) {
        console.error('Error rendering employees page:', err);
        next(err);
    }
};

/**
 * GET /api/v1/employees (JSON)
 */
export const listEmployees = async (req, res, next) => {
    try {
        const search = (req.query.search || '').trim();
        const userId = req.user?.id;
        const isAdmin = isAdminUser(req.user);
        const organizationId = await resolveOrganizationIdFromRequest(req);
        const where = {};

        if (!isAdmin && !organizationId) {
            return res.json([]);
        }

        // Non-admin users should only see employees in the active organization.
        if (!isAdmin && organizationId) {
            where.businessId = Number(organizationId);
        } else if (userId && !isAdmin) {
            where.userId = userId;
        }

        if (search) {
            where[Op.or] = [
                { empName: { [Op.like]: `%${search}%` } },
                { empEmail: { [Op.like]: `%${search}%` } },
                { empId: { [Op.like]: `%${search}%` } },
            ];
        }

        let employees = await Employee.findAll({
            where,
            order: [['empId', 'ASC']],
        });

        // Legacy fallback (same rules as HTML page)
        if (!isAdmin && userId && !organizationId && employees.length === 0) {
            const legacy = await isLegacySingleTenantEmployees();
            if (legacy) {
                const legacyWhere = { ...where };
                delete legacyWhere.userId;
                employees = await Employee.findAll({
                    where: legacyWhere,
                    order: [['empId', 'ASC']],
                });
            }
        }

        const employeesPlain = employees.map((e) => e.get({ plain: true }));
        const pendingMembers = !isAdmin && organizationId
            ? await buildPendingInvitedMembers(organizationId, employeesPlain)
            : [];

        console.log('Employees listed via API');
        res.json([...pendingMembers, ...employeesPlain]);
    } catch (err) {
        console.error('Error listing employees:', err);
        next(err);
    }
};

/**
 * GET /api/v1/employees/:id
 * Get single employee with related details
 */
export const getEmployeeById = async (req, res, next) => {
    try {
        const employee = await findEmployeeForUserWithRelations(req);

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json({
            ...sanitizeEmployeeJson(employee),
            portalAccess: buildPortalAccess(employee, null, req),
        });
    } catch (err) {
        console.error('Error fetching employee by id:', err);
        next(err);
    }
};

async function canAccessEmployee(req, employee) {
    if (!employee) return false;
    if (isAdminUser(req.user)) return true;

    const userId = req.user?.id;
    if (!userId) return false;

    const organizationId = await resolveOrganizationIdFromRequest(req);
    const employeeBusinessId =
        employee.businessId != null && employee.businessId !== ''
            ? Number(employee.businessId)
            : null;

    if (organizationId && employeeBusinessId === Number(organizationId)) {
        return true;
    }

    if (employeeBusinessId && (await userBelongsToOrganization(userId, employeeBusinessId))) {
        return true;
    }

    if (Number(employee.userId) === Number(userId)) {
        return true;
    }

    return await isLegacySingleTenantEmployees();
}

async function findEmployeeForUser(req, options = {}) {
    const userId = req.user?.id;
    const isAdmin = isAdminUser(req.user);
    const organizationId = !isAdmin ? await resolveOrganizationIdFromRequest(req) : null;
    const rawId = String(req.params.id || '').trim();
    const numericId = Number.parseInt(rawId, 10);
    const isNumeric = !Number.isNaN(numericId);
    const baseWhere = isNumeric ? { id: numericId } : { empId: rawId };

    const where = { ...baseWhere };
    if (!isAdmin) {
        if (organizationId) {
            where.businessId = Number(organizationId);
        } else if (userId) {
            where.userId = userId;
        }
    }

    let employee = await Employee.findOne({ where, ...options });

    if (!employee) {
        const candidate = await Employee.findOne({ where: baseWhere, ...options });
        if (candidate && (await canAccessEmployee(req, candidate))) {
            employee = candidate;
        }
    }

    if (!employee && userId && !isAdmin) {
        const legacy = await isLegacySingleTenantEmployees();
        if (legacy) {
            employee = await Employee.findOne({ where: baseWhere, ...options });
        }
    }

    return employee;
}

const employeeRelationIncludes = [
    { model: EmployeeEducation, as: 'educations' },
    { model: EmployeeExperience, as: 'experiences' },
    { model: EmployeeDocument, as: 'documents' },
];

async function findEmployeeForUserWithRelations(req) {
    try {
        return await findEmployeeForUser(req, { include: employeeRelationIncludes });
    } catch (err) {
        console.warn('Employee fetch with relations failed, retrying without includes:', err.message);
        const employee = await findEmployeeForUser(req);
        if (!employee) return null;
        employee.setDataValue('educations', []);
        employee.setDataValue('experiences', []);
        employee.setDataValue('documents', []);
        return employee;
    }
}

/**
 * PATCH /api/v1/employees/:id/status
 * Set employee active/inactive (HR only).
 */
export const updateEmployeeStatus = async (req, res, next) => {
    try {
        const employee = await findEmployeeForUser(req);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        if (req.body?.isActive === undefined) {
            return res.status(400).json({ error: 'isActive is required (true or false)' });
        }

        const isActive = toBool(req.body.isActive);
        employee.isActive = isActive;
        await employee.save();

        return res.json({
            ...sanitizeEmployeeJson(employee),
            message: isActive ? 'Employee marked as active' : 'Employee marked as inactive',
        });
    } catch (err) {
        console.error('Error updating employee status:', err);
        next(err);
    }
};

/**
 * POST /api/v1/employees
 * Body:
 * {
 *   ... core employee fields (personal, professional, compensation),
 *   educations: [ {...}, {...} ],
 *   experiences: [ {...}, {...} ],
 *   documents: [ {...}, {...} ]
 * }
 */
export const createEmployee = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        console.log('Received POST request with body:', req.body);

        const userId = req.user?.id || 1;
        const organizationId = await resolveOrganizationIdFromRequest(req);
        if (!organizationId) {
            await t.rollback();
            return res.status(400).json({
                error: 'No active organization selected',
                message: 'Create or join an organization before adding employees.',
            });
        }

        // Allow partial/draft employee records — apply defaults for unset required DB fields.
        const firstName = strOrDefault(req.body.firstName, 'New');
        const lastName = strOrDefault(req.body.lastName, 'Employee');
        const empPhone = normalizePhone(req.body.empPhone);
        const empEmail = strOrDefault(req.body.empEmail, draftEmployeeEmail(organizationId)).toLowerCase();
        const empDesignation = strOrDefault(req.body.empDesignation, 'Unassigned');
        const empDepartment = strOrDefault(req.body.empDepartment, 'General');
        const empWorkLoc = strOrDefault(req.body.empWorkLoc, 'Unassigned');
        const empDateOfJoining = strOrDefault(req.body.empDateOfJoining, todayDateOnly());
        const empDob = strOrDefault(req.body.empDob, '1990-01-01');
        const empCtc = isBlank(req.body.empCtc) ? 0 : Number(req.body.empCtc);

        const reportingManagerId = await assertReportingManagerForEmployee({
            businessId: organizationId,
            reportingManagerId: req.body.reportingManagerId,
        });

        const typeValidationError = validateEmployeeTypeFields(req.body, req.body.employeeType);
        if (typeValidationError) {
            await t.rollback();
            return res.status(400).json({ error: typeValidationError });
        }

        // 1) Core Employee payload (Sections 1–3: Personal, Professional, Compensation)
        const payload = {
            userId,

            // --- Name ---
            firstName,
            middleName: req.body.middleName?.trim() || null,
            lastName,

            empName: req.body.empName?.trim() || undefined, // auto-built if undefined

            // --- Personal profile ---
            gender: req.body.gender?.trim() || null,
            maritalStatus: req.body.maritalStatus?.trim() || null,
            bloodGroup: req.body.bloodGroup?.trim() || null,
            nationality: req.body.nationality?.trim() || null,
            religion: req.body.religion?.trim() || null,
            casteCategory: req.body.casteCategory?.trim() || null,
            languagesKnown: req.body.languagesKnown?.trim() || null,

            // Contacts
            empPhone,
            altPhone: req.body.altPhone?.trim() || null,
            empEmail,

            // Emergency
            emergencyContactName: req.body.emergencyContactName || null,
            emergencyContactRelation: req.body.emergencyContactRelation || null,
            emergencyContactNumber: req.body.emergencyContactNumber || null,

            // Present address
            presentAddressLine1: req.body.presentAddressLine1 || null,
            presentAddressLine2: req.body.presentAddressLine2 || null,
            presentCity: req.body.presentCity || null,
            presentState: req.body.presentState || null,
            presentZip: req.body.presentZip || null,
            presentCountry: req.body.presentCountry || null,

            // Permanent address
            permanentSameAsPresent: toBool(req.body.permanentSameAsPresent),
            permanentAddressLine1: req.body.permanentAddressLine1 || null,
            permanentAddressLine2: req.body.permanentAddressLine2 || null,
            permanentCity: req.body.permanentCity || null,
            permanentState: req.body.permanentState || null,
            permanentZip: req.body.permanentZip || null,
            permanentCountry: req.body.permanentCountry || null,

            // --- Professional (Section 2) ---
            employeeType: normalizeEmployeeType(req.body.employeeType),
            empDesignation,
            empDepartment,
            division: req.body.division?.trim() || null,
            subDepartment: req.body.subDepartment?.trim() || null,
            gradeBandLevel: req.body.gradeBandLevel?.trim() || null,
            reportingManagerId,
            empWorkLoc,
            empDateOfJoining,
            probationPeriodMonths: req.body.probationPeriodMonths ? Number(req.body.probationPeriodMonths) : null,
            confirmationDate: req.body.confirmationDate || null,
            employmentStatus: req.body.employmentStatus || 'Active',
            workMode: req.body.workMode || 'On-site',
            lifecycleStage: req.body.lifecycleStage || 'prospect',
            internStipend: isBlank(req.body.internStipend) ? null : Number(req.body.internStipend),
            contractEndDate: req.body.contractEndDate || null,
            internship_start_date: req.body.internship_start_date || req.body.internshipStartDate || null,
            internship_end_date: req.body.internship_end_date || req.body.internshipEndDate || null,
            internship_offer_date: req.body.internship_offer_date || req.body.internshipOfferDate || null,
            resignationDate: req.body.resignationDate || null,
            lastWorkingDay: req.body.lastWorkingDay || null,
            noticePeriodDays: req.body.noticePeriodDays ? Number(req.body.noticePeriodDays) : null,
            exitReason: req.body.exitReason || null,
            exitType: req.body.exitType || null,
            exitCategory: req.body.exitCategory || null,
            empIncrementEffectiveDate: req.body.empIncrementEffectiveDate || null,

            // --- Dates ---
            empDob,

            // --- Compensation (Section 3) ---
            empCtc,
            grossSalaryMonthly: req.body.grossSalaryMonthly || null,
            basicSalary: req.body.basicSalary || null,
            hra: req.body.hra || null,
            conveyanceAllowance: req.body.conveyanceAllowance || null,
            medicalAllowance: req.body.medicalAllowance || null,
            specialAllowance: req.body.specialAllowance || null,
            performanceBonus: req.body.performanceBonus || null,
            variablePay: req.body.variablePay || null,
            overtimeEligible: toBool(req.body.overtimeEligible),
            shiftAllowance: req.body.shiftAllowance || null,
            pfDeduction: req.body.pfDeduction || null,
            esiDeduction: req.body.esiDeduction || null,
            professionalTax: req.body.professionalTax || null,
            tdsDeduction: req.body.tdsDeduction || null,
            netSalary: req.body.netSalary || null,

            // KYC core
            // empAadhar: req.body.empAadhar,
            // empPan: req.body.empPan,

            // Organization association is always derived from authenticated context.
            businessId: Number(organizationId),
        };

        // Optional manual empId; otherwise auto-generate in hook
        if (req.body.empId && req.body.empId.trim() !== '') {
            payload.empId = req.body.empId.trim();
        }

        // Allow explicit default password from last-step portal credentials section.
        const requestedPortalPassword = String(req.body?.portalPassword || '').trim();
        if (requestedPortalPassword && requestedPortalPassword.length < 8) {
            await t.rollback();
            return res.status(400).json({
                error: 'Default password must be at least 8 characters',
            });
        }

        const generatedPassword = requestedPortalPassword || generatePassword(12);
        payload.password = generatedPassword;
        payload.canLogin = true;
        payload.forcePasswordReset = true;
        payload.resetPasswordToken = encodeHrDefaultPasswordToken(generatedPassword);
        payload.resetPasswordExpires = null;

        // 2) Create Employee first
        const employee = await Employee.create(payload, { transaction: t });
        const employeeId = employee.id;

        // Store plain password temporarily for email (before it gets hashed)
        const plainPassword = generatedPassword;

        // 3) Parse related sections: education, experience, documents
        const educations = Array.isArray(req.body.educations)
            ? req.body.educations
            : [];

        const experiences = Array.isArray(req.body.experiences)
            ? req.body.experiences
            : [];

        const documents = Array.isArray(req.body.documents)
            ? req.body.documents
            : [];

        // 4) Insert education rows
        if (educations.length) {
            await Promise.all(
                educations.map((edu) =>
                    EmployeeEducation.create(
                        {
                            employeeId,
                            level: edu.level || 'Other',
                            degree: edu.degree || null,
                            specialization: edu.specialization || null,
                            institutionName: edu.institutionName || null,
                            board: edu.board || null,
                            startYear: edu.startYear || null,
                            endYear: edu.endYear || null,
                            yearOfPassing: edu.yearOfPassing || null,
                            percentageOrCgpa: edu.percentageOrCgpa || null,
                            modeOfStudy: edu.modeOfStudy || null,
                            educationType: edu.educationType || null,
                            country: edu.country || null,
                            city: edu.city || null,
                            certificateUrl: edu.certificateUrl || null,
                            googleDriveUrl: edu.googleDriveUrl || null,
                        },
                        { transaction: t }
                    )
                )
            );
        }

        // 5) Insert experience rows
        if (experiences.length) {
            await Promise.all(
                experiences.map((exp) =>
                    EmployeeExperience.create(
                        {
                            employeeId,
                            organizationName: exp.organizationName,
                            jobTitle: exp.jobTitle,
                            employmentType: exp.employmentType || null,
                            department: exp.department || null,
                            industryType: exp.industryType || null,
                            companyLocationCity: exp.companyLocationCity || null,
                            companyLocationCountry: exp.companyLocationCountry || null,
                            startDate: exp.startDate || null,
                            endDate: exp.endDate || null,
                            isCurrent: toBool(exp.isCurrent),
                            durationText: exp.durationText || null,
                            jobLevel: exp.jobLevel || null,
                            lastDrawnCtc: exp.lastDrawnCtc || null,
                            reasonForLeaving: exp.reasonForLeaving || null,
                            noticePeriodServed: toBool(exp.noticePeriodServed),

                            // NEW: supporting document URLs
                            relievingLetterUrl: exp.relievingLetterUrl || null,
                            salarySlipsUrl: exp.salarySlipsUrl || null,
                            bankStatementUrl: exp.bankStatementUrl || null,
                        },
                        { transaction: t }
                    )
                )
            );
        }

        // 6) Insert documents rows
        if (documents.length) {
            await Promise.all(
                documents.map((doc) =>
                    EmployeeDocument.create(
                        {
                            employeeId,
                            category: doc.category || 'KYC',
                            documentType: doc.documentType,
                            nameOnDocument: doc.nameOnDocument || null,
                            documentNumber: doc.documentNumber || null,
                            issueDate: doc.issueDate || null,
                            expiryDate: doc.expiryDate || null,
                            verificationStatus: doc.verificationStatus || 'Pending',
                            verifiedBy: doc.verifiedBy || null,
                            verifiedAt: doc.verifiedAt || null,
                            fileUrl: doc.fileUrl || null,
                            documentImageUrl: doc.documentImageUrl || null,
                            notes: doc.notes || null,
                        },
                        { transaction: t }
                    )
                )
            );
        }

        await t.commit();

        console.log('Created new employee with related records:', employeeId);

        const portalUrl = getPortalLoginUrl(req);
        let emailSent = false;
        let emailError = null;

        const shouldSendCredentialsEmail = String(req.body?.sendCredentialsEmail ?? 'true').toLowerCase() !== 'false';

        // Send welcome email with credentials (non-blocking - don't fail if email fails)
        if (employee.empEmail && shouldSendCredentialsEmail) {
            try {
                const emailResult = await sendWelcomeEmail(employee, plainPassword, portalUrl);
                emailSent = emailResult.sent;
                emailError = emailResult.error || null;
                if (emailSent) {
                    console.log('Welcome email sent to:', employee.empEmail);
                }
            } catch (emailErrorCaught) {
                console.error('Failed to send welcome email:', emailErrorCaught);
                emailError = emailErrorCaught?.message || 'Email delivery failed';
            }
        }

        return res.status(201).json({
            ...sanitizeEmployeeJson(employee),
            portalAccess: buildPortalAccess(employee, plainPassword, req, emailSent, emailError),
        });
    } catch (err) {
        await t.rollback();
        console.error('Error creating employee:', err);
        console.error('Error details:', {
            name: err.name,
            message: err.message,
            parent: err.parent ? {
                code: err.parent.code,
                errno: err.parent.errno,
                sqlState: err.parent.sqlState,
                sqlMessage: err.parent.sqlMessage,
                sql: err.parent.sql
            } : null,
            errors: err.errors ? err.errors.map(e => ({
                path: e.path,
                message: e.message,
                value: e.value
            })) : null
        });
        if (err.name === 'SequelizeValidationError') {
            return res
                .status(400)
                .json({ error: err.errors.map((e) => e.message).join(', ') });
        }
        if (err.name === 'SequelizeDatabaseError') {
            return res
                .status(400)
                .json({
                    error: 'Database error: ' + (err.parent?.sqlMessage || err.message),
                    details: err.parent?.sqlMessage
                });
        }
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res
                .status(400)
                .json({
                    error: 'Duplicate entry: ' + (err.errors?.[0]?.message || err.message)
                });
        }
        if (err.statusCode === 400) {
            return res.status(400).json({ error: err.message, message: err.message });
        }
        next(err);
    }
};

/**
 * PUT /api/v1/employees/:id
 * Update employee + nested sections
 */
export const updateEmployee = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        console.log('--- UPDATE EMPLOYEE CALLED ---');
        console.log('Params id:', req.params.id);
        console.log('Body:', JSON.stringify(req.body, null, 2));
        console.log('User:', req.user?.id);
        const id = Number.parseInt(String(req.params.id || '').trim(), 10);

        if (Number.isNaN(id)) {
            await t.rollback();
            return res.status(400).json({ error: 'Invalid employee ID' });
        }

        let employee = await findEmployeeForUser(req, { transaction: t, lock: t.LOCK.UPDATE });
        if (!employee) {
            await t.rollback();
            return res.status(404).json({ error: 'Employee not found' });
        }

        const reportingManagerId = await assertReportingManagerForEmployee({
            employeeId: employee.id,
            businessId: employee.businessId,
            reportingManagerId: req.body.reportingManagerId ?? employee.reportingManagerId,
        });

        const mergedType = normalizeEmployeeType(
            mergeEmployeeField(req.body, employee, 'employeeType', 'Permanent')
        );
        const typeValidationError = validateEmployeeTypeFields(
            { ...employee.get({ plain: true }), ...req.body, employeeType: mergedType },
            mergedType
        );
        if (typeValidationError) {
            await t.rollback();
            return res.status(400).json({ error: typeValidationError });
        }

        const payload = {
            // keep userId as is
            firstName: mergeEmployeeField(req.body, employee, 'firstName', 'New'),
            middleName: mergeEmployeeField(req.body, employee, 'middleName', null),
            lastName: mergeEmployeeField(req.body, employee, 'lastName', 'Employee'),
            empName: mergeEmployeeField(req.body, employee, 'empName', employee.empName),

            gender: mergeEmployeeField(req.body, employee, 'gender', null),
            maritalStatus: mergeEmployeeField(req.body, employee, 'maritalStatus', null),
            bloodGroup: mergeEmployeeField(req.body, employee, 'bloodGroup', null),
            nationality: mergeEmployeeField(req.body, employee, 'nationality', null),
            religion: mergeEmployeeField(req.body, employee, 'religion', null),
            casteCategory: mergeEmployeeField(req.body, employee, 'casteCategory', null),
            languagesKnown: mergeEmployeeField(req.body, employee, 'languagesKnown', null),

            empPhone: normalizePhone(
                mergeEmployeeField(req.body, employee, 'empPhone', '0000000000')
            ),
            altPhone: mergeEmployeeField(req.body, employee, 'altPhone', null),
            empEmail: String(
                mergeEmployeeField(
                    req.body,
                    employee,
                    'empEmail',
                    draftEmployeeEmail(employee.businessId || 0)
                )
            ).toLowerCase(),

            emergencyContactName: mergeEmployeeField(req.body, employee, 'emergencyContactName', null),
            emergencyContactRelation: mergeEmployeeField(req.body, employee, 'emergencyContactRelation', null),
            emergencyContactNumber: mergeEmployeeField(req.body, employee, 'emergencyContactNumber', null),

            presentAddressLine1: mergeEmployeeField(req.body, employee, 'presentAddressLine1', null),
            presentAddressLine2: mergeEmployeeField(req.body, employee, 'presentAddressLine2', null),
            presentCity: mergeEmployeeField(req.body, employee, 'presentCity', null),
            presentState: mergeEmployeeField(req.body, employee, 'presentState', null),
            presentZip: mergeEmployeeField(req.body, employee, 'presentZip', null),
            presentCountry: mergeEmployeeField(req.body, employee, 'presentCountry', null),

            permanentSameAsPresent: toBool(req.body.permanentSameAsPresent),
            permanentAddressLine1: mergeEmployeeField(req.body, employee, 'permanentAddressLine1', null),
            permanentAddressLine2: mergeEmployeeField(req.body, employee, 'permanentAddressLine2', null),
            permanentCity: mergeEmployeeField(req.body, employee, 'permanentCity', null),
            permanentState: mergeEmployeeField(req.body, employee, 'permanentState', null),
            permanentZip: mergeEmployeeField(req.body, employee, 'permanentZip', null),
            permanentCountry: mergeEmployeeField(req.body, employee, 'permanentCountry', null),

            employeeType: normalizeEmployeeType(
                mergeEmployeeField(req.body, employee, 'employeeType', 'Permanent')
            ),
            empDesignation: mergeEmployeeField(req.body, employee, 'empDesignation', 'Unassigned'),
            empDepartment: mergeEmployeeField(req.body, employee, 'empDepartment', 'General'),
            division: mergeEmployeeField(req.body, employee, 'division', null),
            subDepartment: mergeEmployeeField(req.body, employee, 'subDepartment', null),
            gradeBandLevel: mergeEmployeeField(req.body, employee, 'gradeBandLevel', null),
            reportingManagerId,
            empWorkLoc: mergeEmployeeField(req.body, employee, 'empWorkLoc', 'Unassigned'),
            empDateOfJoining: mergeEmployeeField(req.body, employee, 'empDateOfJoining', todayDateOnly()),
            probationPeriodMonths: req.body.probationPeriodMonths
                ? Number(req.body.probationPeriodMonths)
                : employee.probationPeriodMonths,
            confirmationDate: mergeEmployeeField(req.body, employee, 'confirmationDate', null),
            employmentStatus: mergeEmployeeField(req.body, employee, 'employmentStatus', 'Active'),
            workMode: mergeEmployeeField(req.body, employee, 'workMode', 'On-site'),
            lifecycleStage: mergeEmployeeField(req.body, employee, 'lifecycleStage', employee.lifecycleStage || 'prospect'),
            internStipend: isBlank(req.body.internStipend)
                ? employee.internStipend
                : Number(req.body.internStipend),
            contractEndDate: mergeEmployeeField(req.body, employee, 'contractEndDate', null),
            internship_start_date: mergeEmployeeField(req.body, employee, 'internship_start_date', employee.internship_start_date),
            internship_end_date: mergeEmployeeField(req.body, employee, 'internship_end_date', employee.internship_end_date),
            internship_offer_date: mergeEmployeeField(req.body, employee, 'internship_offer_date', employee.internship_offer_date),
            resignationDate: mergeEmployeeField(req.body, employee, 'resignationDate', null),
            lastWorkingDay: mergeEmployeeField(req.body, employee, 'lastWorkingDay', null),
            noticePeriodDays: req.body.noticePeriodDays
                ? Number(req.body.noticePeriodDays)
                : employee.noticePeriodDays,
            exitReason: mergeEmployeeField(req.body, employee, 'exitReason', null),
            exitType: mergeEmployeeField(req.body, employee, 'exitType', null),
            exitCategory: mergeEmployeeField(req.body, employee, 'exitCategory', null),
            empIncrementEffectiveDate: mergeEmployeeField(req.body, employee, 'empIncrementEffectiveDate', null),

            empDob: mergeEmployeeField(req.body, employee, 'empDob', '1990-01-01'),

            empCtc: isBlank(req.body.empCtc)
                ? (employee.empCtc ?? 0)
                : Number(req.body.empCtc),
            grossSalaryMonthly: mergeEmployeeField(req.body, employee, 'grossSalaryMonthly', null),
            basicSalary: mergeEmployeeField(req.body, employee, 'basicSalary', null),
            hra: mergeEmployeeField(req.body, employee, 'hra', null),
            conveyanceAllowance: mergeEmployeeField(req.body, employee, 'conveyanceAllowance', null),
            medicalAllowance: mergeEmployeeField(req.body, employee, 'medicalAllowance', null),
            specialAllowance: mergeEmployeeField(req.body, employee, 'specialAllowance', null),
            performanceBonus: mergeEmployeeField(req.body, employee, 'performanceBonus', null),
            variablePay: mergeEmployeeField(req.body, employee, 'variablePay', null),
            overtimeEligible: req.body.overtimeEligible !== undefined
                ? toBool(req.body.overtimeEligible)
                : employee.overtimeEligible,
            shiftAllowance: mergeEmployeeField(req.body, employee, 'shiftAllowance', null),
            pfDeduction: mergeEmployeeField(req.body, employee, 'pfDeduction', null),
            esiDeduction: mergeEmployeeField(req.body, employee, 'esiDeduction', null),
            professionalTax: mergeEmployeeField(req.body, employee, 'professionalTax', null),
            tdsDeduction: mergeEmployeeField(req.body, employee, 'tdsDeduction', null),
            netSalary: mergeEmployeeField(req.body, employee, 'netSalary', null),

            // Business association
            businessId: req.body.businessId ? Number(req.body.businessId) : employee.businessId,
        };

        // Allow manual empId change if passed
        if (req.body.empId && req.body.empId.trim() !== '') {
            payload.empId = req.body.empId.trim();
        }

        await employee.update(payload, { transaction: t });

        // Nested sections
        const educations = Array.isArray(req.body.educations)
            ? req.body.educations
            : [];
        const experiences = Array.isArray(req.body.experiences)
            ? req.body.experiences
            : [];
        const documents = Array.isArray(req.body.documents)
            ? req.body.documents
            : [];

        // Clear existing child rows then reinsert
        await EmployeeEducation.destroy({ where: { employeeId: id }, transaction: t });
        await EmployeeExperience.destroy({ where: { employeeId: id }, transaction: t });
        await EmployeeDocument.destroy({ where: { employeeId: id }, transaction: t });

        if (educations.length) {
            await Promise.all(
                educations.map((edu) =>
                    EmployeeEducation.create(
                        {
                            employeeId: id,
                            level: edu.level || 'Other',
                            degree: edu.degree || null,
                            specialization: edu.specialization || null,
                            institutionName: edu.institutionName || null,
                            board: edu.board || null,
                            startYear: edu.startYear || null,
                            endYear: edu.endYear || null,
                            yearOfPassing: edu.yearOfPassing || null,
                            percentageOrCgpa: edu.percentageOrCgpa || null,
                            modeOfStudy: edu.modeOfStudy || null,
                            educationType: edu.educationType || null,
                            country: edu.country || null,
                            city: edu.city || null,
                            certificateUrl: edu.certificateUrl || null,
                            googleDriveUrl: edu.googleDriveUrl || null,
                        },
                        { transaction: t }
                    )
                )
            );
        }

        if (experiences.length) {
            await Promise.all(
                experiences.map((exp) =>
                    EmployeeExperience.create(
                        {
                            employeeId: id,
                            organizationName: exp.organizationName,
                            jobTitle: exp.jobTitle,
                            employmentType: exp.employmentType || null,
                            department: exp.department || null,
                            industryType: exp.industryType || null,
                            companyLocationCity: exp.companyLocationCity || null,
                            companyLocationCountry: exp.companyLocationCountry || null,
                            startDate: exp.startDate || null,
                            endDate: exp.endDate || null,
                            isCurrent: toBool(exp.isCurrent),
                            durationText: exp.durationText || null,
                            jobLevel: exp.jobLevel || null,
                            lastDrawnCtc: exp.lastDrawnCtc || null,
                            reasonForLeaving: exp.reasonForLeaving || null,
                            noticePeriodServed: toBool(exp.noticePeriodServed),

                            // NEW: supporting document URLs
                            relievingLetterUrl: exp.relievingLetterUrl || null,
                            salarySlipsUrl: exp.salarySlipsUrl || null,
                            bankStatementUrl: exp.bankStatementUrl || null,
                        },
                        { transaction: t }
                    )
                )
            );
        }


        if (documents.length) {
            await Promise.all(
                documents.map((doc) =>
                    EmployeeDocument.create(
                        {
                            employeeId: id,
                            category: doc.category || 'KYC',
                            documentType: doc.documentType,
                            nameOnDocument: doc.nameOnDocument || null,
                            documentNumber: doc.documentNumber || null,
                            issueDate: doc.issueDate || null,
                            expiryDate: doc.expiryDate || null,
                            verificationStatus: doc.verificationStatus || 'Pending',
                            verifiedBy: doc.verifiedBy || null,
                            verifiedAt: doc.verifiedAt || null,
                            fileUrl: doc.fileUrl || null,
                            documentImageUrl: doc.documentImageUrl || null,
                            notes: doc.notes || null,
                        },
                        { transaction: t }
                    )
                )
            );
        }

        await t.commit();
        console.log('Updated employee with id:', id);
        return res.json(employee);
    } catch (err) {
        await t.rollback();
        console.error('Error updating employee:', err);
        if (err.name === 'SequelizeValidationError') {
            return res
                .status(400)
                .json({ error: err.errors.map((e) => e.message).join(', ') });
        }
        if (err.statusCode === 400) {
            return res.status(400).json({ error: err.message, message: err.message });
        }
        next(err);
    }
};

/**
 * POST /api/v1/employees/:id/portal-access/reset
 * Generate a new employee portal password and return credentials to HR
 */
export const resetEmployeePortalAccess = async (req, res, next) => {
    try {
        const id = Number.parseInt(String(req.params.id || '').trim(), 10);

        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'Invalid employee ID' });
        }

        const employee = await findEmployeeForUser(req);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        if (!employee.empEmail) {
            return res.status(400).json({ error: 'Employee must have an email address for portal login' });
        }

        const plainPassword = generatePassword(12);
        employee.password = plainPassword;
        employee.canLogin = true;
        employee.forcePasswordReset = true;
        employee.resetPasswordToken = encodeHrDefaultPasswordToken(plainPassword);
        employee.resetPasswordExpires = null;
        await employee.save();

        const portalUrl = getPortalLoginUrl(req);
        let emailSent = false;
        let emailError = null;
        try {
            const emailResult = await sendWelcomeEmail(employee, plainPassword, portalUrl);
            emailSent = emailResult.sent;
            emailError = emailResult.error || null;
        } catch (emailErrorCaught) {
            console.error('Failed to send portal credentials email:', emailErrorCaught);
            emailError = emailErrorCaught?.message || 'Email delivery failed';
        }

        return res.json({
            ...sanitizeEmployeeJson(employee),
            portalAccess: buildPortalAccess(employee, plainPassword, req, emailSent, emailError),
        });
    } catch (err) {
        console.error('Error resetting portal access:', err);
        next(err);
    }
};

async function findEmployeeForPortalAccess(req, id) {
    if (Number.isNaN(id)) {
        return { error: { status: 400, message: 'Invalid employee ID' } };
    }

    const userId = req.user?.id;
    const isAdmin = isAdminUser(req.user);
    const organizationId = !isAdmin ? await resolveOrganizationIdFromRequest(req) : null;
    const baseWhere = { id };

    const where = { ...baseWhere };
    if (!isAdmin) {
        if (organizationId) {
            where.businessId = Number(organizationId);
        } else if (userId) {
            where.userId = userId;
        }
    }

    let employee = await Employee.findOne({ where });
    if (!employee && userId && !isAdmin) {
        const legacy = await isLegacySingleTenantEmployees();
        if (legacy) {
            employee = await Employee.findOne({ where: baseWhere });
        }
    }

    if (!employee) {
        return { error: { status: 404, message: 'Employee not found' } };
    }

    if (!employee.empEmail) {
        return { error: { status: 400, message: 'Employee must have an email address for portal login' } };
    }

    return { employee };
}

/**
 * POST /api/v1/employees/:id/portal-access/send
 * Send portal username + password to the employee's registered email.
 */
export const sendEmployeePortalCredentials = async (req, res, next) => {
    try {
        const id = Number.parseInt(String(req.params.id || '').trim(), 10);
        const lookup = await findEmployeeForPortalAccess(req, id);
        if (lookup.error) {
            return res.status(lookup.error.status).json({ error: lookup.error.message });
        }

        const { employee } = lookup;
        let plainPassword = decodeHrDefaultPasswordToken(employee.resetPasswordToken);
        let passwordRegenerated = false;

        if (plainPassword) {
            const stillValid = await employee.isPasswordCorrect(plainPassword);
            if (!stillValid) plainPassword = null;
        }

        if (!plainPassword) {
            plainPassword = generatePassword(12);
            employee.password = plainPassword;
            employee.canLogin = true;
            employee.forcePasswordReset = true;
            employee.resetPasswordToken = encodeHrDefaultPasswordToken(plainPassword);
            await employee.save();
            passwordRegenerated = true;
        }

        const portalUrl = getPortalLoginUrl(req);
        const emailResult = await sendWelcomeEmail(employee, plainPassword, portalUrl);

        return res.json({
            emailSent: emailResult.sent,
            emailError: emailResult.error || null,
            passwordRegenerated,
            portalAccess: buildPortalAccess(employee, plainPassword, req, emailResult.sent, emailResult.error),
        });
    } catch (err) {
        console.error('Error sending portal credentials:', err);
        next(err);
    }
};

/**
 * POST /api/v1/employees/:id/portal-access/send-email
 * Resend portal credentials email using the current password (must match stored hash).
 */
export const sendEmployeePortalCredentialsEmail = async (req, res, next) => {
    try {
        const id = Number.parseInt(String(req.params.id || '').trim(), 10);
        const password = String(req.body?.password || '').trim();

        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'Invalid employee ID' });
        }

        if (!password) {
            return res.status(400).json({ error: 'Password is required to resend credentials email' });
        }

        const employee = await findEmployeeForUser(req);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        if (!employee.empEmail) {
            return res.status(400).json({ error: 'Employee must have an email address for portal login' });
        }

        const passwordMatches = await employee.isPasswordCorrect(password);
        if (!passwordMatches) {
            return res.status(400).json({ error: 'Password does not match current portal credentials' });
        }

        const portalUrl = getPortalLoginUrl(req);
        const emailResult = await sendWelcomeEmail(employee, password, portalUrl);

        return res.json({
            emailSent: emailResult.sent,
            emailError: emailResult.error || null,
            portalAccess: buildPortalAccess(employee, password, req, emailResult.sent, emailResult.error),
        });
    } catch (err) {
        console.error('Error resending portal credentials email:', err);
        next(err);
    }
};

/**
 * DELETE /api/v1/employees/:id
 * Delete employee + nested rows
 */
export const deleteEmployee = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const id = Number.parseInt(String(req.params.id || '').trim(), 10);

        if (Number.isNaN(id)) {
            await t.rollback();
            return res.status(400).json({ error: 'Invalid employee ID' });
        }

        const employee = await findEmployeeForUser(req, { transaction: t, lock: t.LOCK.UPDATE });
        if (!employee) {
            await t.rollback();
            return res.status(404).json({ error: 'Employee not found' });
        }

        await EmployeeEducation.destroy({ where: { employeeId: id }, transaction: t });
        await EmployeeExperience.destroy({ where: { employeeId: id }, transaction: t });
        await EmployeeDocument.destroy({ where: { employeeId: id }, transaction: t });
        await employee.destroy({ transaction: t });

        await t.commit();
        console.log('Deleted employee with id:', id);
        return res.json({ success: true });
    } catch (err) {
        await t.rollback();
        console.error('Error deleting employee:', err);
        next(err);
    }
};

export const uploadExperienceDocument = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowed.includes(req.file.mimetype)) {
            return res.status(400).json({ error: 'Invalid file type. Use PDF, JPG, or PNG.' });
        }

        const dir = path.join(process.cwd(), 'storage', 'employee-experience');
        fs.mkdirSync(dir, { recursive: true });

        const extFromMime = {
            'application/pdf': '.pdf',
            'image/jpeg': '.jpg',
            'image/png': '.png',
        };
        const ext = path.extname(req.file.originalname) || extFromMime[req.file.mimetype] || '';
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
        const filePath = path.join(dir, safeName);

        fs.writeFileSync(filePath, req.file.buffer);

        return res.json({
            url: `storage/employee-experience/${safeName}`,
            fileName: req.file.originalname,
        });
    } catch (err) {
        console.error('Error uploading experience document:', err);
        next(err);
    }
};

export const uploadEmployeeDocument = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const allowed = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
        ];
        if (!allowed.includes(req.file.mimetype)) {
            return res.status(400).json({ error: 'Invalid file type. Use PDF, DOC, DOCX, JPG, or PNG.' });
        }

        const dir = path.join(process.cwd(), 'storage', 'employee-documents');
        fs.mkdirSync(dir, { recursive: true });

        const extFromMime = {
            'application/pdf': '.pdf',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'image/jpeg': '.jpg',
            'image/png': '.png',
        };
        const ext = path.extname(req.file.originalname) || extFromMime[req.file.mimetype] || '';
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
        const filePath = path.join(dir, safeName);

        fs.writeFileSync(filePath, req.file.buffer);

        return res.json({
            url: `storage/employee-documents/${safeName}`,
            fileName: req.file.originalname,
        });
    } catch (err) {
        console.error('Error uploading employee document:', err);
        next(err);
    }
};

export const uploadEducationCertificate = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowed.includes(req.file.mimetype)) {
            return res.status(400).json({ error: 'Invalid file type. Use PDF, JPG, or PNG.' });
        }

        const dir = path.join(process.cwd(), 'storage', 'employee-education');
        fs.mkdirSync(dir, { recursive: true });

        const extFromMime = {
            'application/pdf': '.pdf',
            'image/jpeg': '.jpg',
            'image/png': '.png',
        };
        const ext = path.extname(req.file.originalname) || extFromMime[req.file.mimetype] || '';
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
        const filePath = path.join(dir, safeName);

        fs.writeFileSync(filePath, req.file.buffer);

        return res.json({
            url: `storage/employee-education/${safeName}`,
            fileName: req.file.originalname,
        });
    } catch (err) {
        console.error('Error uploading education certificate:', err);
        next(err);
    }
};

export const downloadBulkImportTemplate = async (req, res, next) => {
    try {
        const { getBulkImportCsvTemplate } = await import('../services/employeeBulkImport.service.js');
        const csv = getBulkImportCsvTemplate();
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="employee-import-template.csv"');
        return res.send(csv);
    } catch (err) {
        next(err);
    }
};

export const bulkImportEmployees = async (req, res, next) => {
    try {
        const organizationId = await resolveOrganizationIdFromRequest(req);
        if (!organizationId) {
            return res.status(400).json({ error: 'No active organization selected' });
        }

        const { csv, defaultReportingManagerId } = req.body || {};
        if (!csv || !String(csv).trim()) {
            return res.status(400).json({ error: 'csv content is required' });
        }

        const {
            parseEmployeeCsv,
            bulkImportEmployees: runBulkImport,
        } = await import('../services/employeeBulkImport.service.js');

        const rows = parseEmployeeCsv(csv);
        const results = await runBulkImport({
            rows,
            businessId: organizationId,
            userId: req.user?.id || 1,
            defaultReportingManagerId: Number(defaultReportingManagerId),
            actorUserId: req.user?.id,
        });

        return res.json({
            message: `Import complete: ${results.created.length} created, ${results.skipped.length} skipped, ${results.errors.length} errors`,
            ...results,
        });
    } catch (err) {
        if (err.statusCode === 400) return res.status(400).json({ error: err.message });
        next(err);
    }
};

