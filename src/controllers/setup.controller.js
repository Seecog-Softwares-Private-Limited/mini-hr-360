import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { sequelize } from '../db/index.js';
import { Business } from '../models/Business.js';
import { Department } from '../models/Department.js';
import { Designation } from '../models/Designation.js';
import { LeaveType } from '../models/LeaveType.js';
import Employee from '../models/Employee.js';
import Shift from '../models/Shift.js';
import SalaryComponent from '../models/payroll.SalaryComponent.js';
import PayrollSetting from '../models/payrollSetting.js';
import BusinessAddress from '../models/BusinessAddress.js';
import BranchLocation from '../models/BranchLocation.js';
import AttendanceRule from '../models/AttendanceRule.js';
import OrganizationStatutorySetting from '../models/OrganizationStatutorySetting.js';
import { getSetupStatus } from '../services/setup/setupStatusService.js';
import {
  ensureSetupProgress,
  markStepCompleted,
  skipStep,
  finishSetup,
  seedDefaultSetupData,
} from '../services/setup/setupProgressService.js';
import {
  validateCompanyDetails,
  validateBranch,
  validateLeavePolicy,
  validateAttendanceRules,
  validateSalaryComponent,
  validateStatutory,
  validateEmail,
} from '../services/setup/setupValidationService.js';
import { createAuditLog, getClientIp } from '../services/setup/auditLogService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_DIR = path.join(__dirname, '../../storage/logos');

function maskBankAccount(num) {
  if (!num) return null;
  const s = String(num);
  if (s.length <= 4) return '****';
  return '*'.repeat(s.length - 4) + s.slice(-4);
}

function sanitizeStatutoryForView(record, canEdit) {
  if (!record) return null;
  const plain = record.toJSON ? record.toJSON() : record;
  if (canEdit) return plain;
  return {
    ...plain,
    payrollBankAccountNumber: maskBankAccount(plain.payrollBankAccountNumber),
    pfEstablishmentNumber: plain.pfEstablishmentNumber ? '***' : null,
    esiEmployerCode: plain.esiEmployerCode ? '***' : null,
  };
}

async function upsertRegisteredAddress(businessId, addressName, fullAddress) {
  const normalizedAddress = String(fullAddress || '').trim();
  if (!businessId || !normalizedAddress) return null;
  const existing = await BusinessAddress.findOne({
    where: { businessId, addressType: 'REGISTERED' },
    order: [['createdAt', 'ASC']],
  });
  if (existing) {
    await existing.update({ addressName: addressName || 'Registered Office', fullAddress: normalizedAddress, status: 'ACTIVE' });
    return existing;
  }
  return BusinessAddress.create({
    businessId,
    addressName: addressName || 'Registered Office',
    fullAddress: normalizedAddress,
    addressType: 'REGISTERED',
    status: 'ACTIVE',
  });
}

export const getSetupStatusHandler = asyncHandler(async (req, res) => {
  const businessId = req.setupContext?.businessId || req.businessId;
  const status = await getSetupStatus(businessId);
  return res.status(200).json(new ApiResponse(200, {
    ...status,
    canEdit: req.setupContext?.canEdit ?? false,
  }, 'Setup status retrieved'));
});

export const getCompanyDetails = asyncHandler(async (req, res) => {
  const businessId = req.setupContext?.businessId || req.businessId;
  const business = await Business.findByPk(businessId);
  if (!business) throw new ApiError(404, 'Organization not found');
  const address = await BusinessAddress.findOne({
    where: { businessId, addressType: 'REGISTERED', status: 'ACTIVE' },
    order: [['createdAt', 'ASC']],
  });
  return res.status(200).json(new ApiResponse(200, {
    legalName: business.legalName,
    displayName: business.displayName || business.businessName,
    businessName: business.businessName,
    gstNumber: business.gstNumber,
    panNumber: business.panNumber,
    tanNumber: business.tanNumber,
    registeredAddress: address?.fullAddress || '',
    addressName: address?.addressName || '',
    city: business.city,
    state: business.state,
    country: business.country,
    pincode: business.pincode,
    logoUrl: business.logoUrl,
    category: business.category,
    timezone: business.timezone,
    financialYearStartMonth: business.financialYearStartMonth || 4,
    phoneNo: business.phoneNo,
    description: business.description,
  }, 'Company details retrieved'));
});

export const updateCompanyDetails = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const body = req.body || {};
  const errors = validateCompanyDetails({
    ...body,
    registeredAddress: body.registeredAddress || body.fullAddress,
  });
  if (errors.length) {
    return res.status(400).json(new ApiResponse(400, { errors }, errors[0].message));
  }

  const business = await Business.findByPk(businessId);
  if (!business) throw new ApiError(404, 'Organization not found');
  const oldValue = business.toJSON();

  await business.update({
    legalName: body.legalName?.trim() || body.businessName?.trim(),
    displayName: body.displayName?.trim() || body.businessName?.trim(),
    businessName: body.displayName?.trim() || body.businessName?.trim() || business.businessName,
    gstNumber: body.gstNumber?.trim().toUpperCase() || null,
    panNumber: body.panNumber?.trim().toUpperCase() || null,
    tanNumber: body.tanNumber?.trim().toUpperCase() || null,
    city: body.city?.trim(),
    state: body.state?.trim(),
    country: body.country?.trim(),
    pincode: body.pincode?.trim(),
    category: body.category || business.category,
    timezone: body.timezone || business.timezone,
    financialYearStartMonth: body.financialYearStartMonth ?? business.financialYearStartMonth,
    phoneNo: body.phoneNo ?? business.phoneNo,
    logoUrl: body.logoUrl ?? business.logoUrl,
  });

  await upsertRegisteredAddress(businessId, body.addressName, body.registeredAddress || body.fullAddress);

  await createAuditLog({
    userId: req.user.id,
    businessId,
    action: 'COMPANY_DETAILS_UPDATED',
    oldValue,
    newValue: business.toJSON(),
    ipAddress: getClientIp(req),
  });

  await markStepCompleted(businessId, 'company_details').catch((err) => {
    console.warn('markStepCompleted failed:', err?.message);
  });
  const status = await getSetupStatus(businessId);
  return res.status(200).json(new ApiResponse(200, { business: business.toJSON(), status }, 'Company details updated'));
});

export const uploadCompanyLogo = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  if (!req.file) throw new ApiError(400, 'No file uploaded');

  if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });
  const ext = path.extname(req.file.originalname) || '.png';
  const filename = `org-${businessId}-${Date.now()}${ext}`;
  const filepath = path.join(LOGO_DIR, filename);
  fs.writeFileSync(filepath, req.file.buffer);

  const logoUrl = `/storage/logos/${filename}`;
  const business = await Business.findByPk(businessId);
  await business.update({ logoUrl });

  return res.status(200).json(new ApiResponse(200, { logoUrl }, 'Logo uploaded'));
});

export const listBranches = asyncHandler(async (req, res) => {
  const businessId = req.setupContext?.businessId || req.businessId;
  const branches = await BranchLocation.findAll({
    where: { businessId, status: 'ACTIVE' },
    order: [['isPrimary', 'DESC'], ['name', 'ASC']],
  });
  return res.status(200).json(new ApiResponse(200, { branches }, 'Branches retrieved'));
});

export const createBranch = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const body = req.body || {};
  const errors = validateBranch(body);
  if (errors.length) {
    return res.status(400).json(new ApiResponse(400, { errors }, errors[0].message));
  }

  const t = await sequelize.transaction();
  try {
    if (body.isPrimary) {
      await BranchLocation.update({ isPrimary: false }, { where: { businessId }, transaction: t });
    }
    const branch = await BranchLocation.create({
      businessId,
      name: body.name.trim(),
      code: body.code?.trim(),
      address: body.address,
      city: body.city,
      state: body.state,
      country: body.country,
      pincode: body.pincode,
      locationType: body.locationType || 'BRANCH',
      isPrimary: !!body.isPrimary,
      latitude: body.latitude,
      longitude: body.longitude,
      geoFenceRadiusMeters: body.geoFenceRadiusMeters,
      status: 'ACTIVE',
    }, { transaction: t });
    await t.commit();

    await createAuditLog({ userId: req.user.id, businessId, action: 'BRANCH_CREATED', newValue: branch.toJSON(), ipAddress: getClientIp(req) });
    await markStepCompleted(businessId, 'branches');
    return res.status(201).json(new ApiResponse(201, { branch }, 'Branch created'));
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

export const updateBranch = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const { id } = req.params;
  const branch = await BranchLocation.findOne({ where: { id, businessId } });
  if (!branch) throw new ApiError(404, 'Branch not found');

  const body = req.body || {};
  const errors = validateBranch({ ...branch.toJSON(), ...body });
  if (errors.length) {
    return res.status(400).json(new ApiResponse(400, { errors }, errors[0].message));
  }

  const t = await sequelize.transaction();
  try {
    if (body.isPrimary) {
      await BranchLocation.update({ isPrimary: false }, { where: { businessId }, transaction: t });
    }
    const oldValue = branch.toJSON();
    await branch.update({
      name: body.name?.trim() ?? branch.name,
      code: body.code?.trim() ?? branch.code,
      address: body.address ?? branch.address,
      city: body.city ?? branch.city,
      state: body.state ?? branch.state,
      country: body.country ?? branch.country,
      pincode: body.pincode ?? branch.pincode,
      locationType: body.locationType ?? branch.locationType,
      isPrimary: body.isPrimary != null ? !!body.isPrimary : branch.isPrimary,
      latitude: body.latitude ?? branch.latitude,
      longitude: body.longitude ?? branch.longitude,
      geoFenceRadiusMeters: body.geoFenceRadiusMeters ?? branch.geoFenceRadiusMeters,
      status: body.status ?? branch.status,
    }, { transaction: t });
    await t.commit();

    await createAuditLog({ userId: req.user.id, businessId, action: 'BRANCH_UPDATED', oldValue, newValue: branch.toJSON(), ipAddress: getClientIp(req) });
    await markStepCompleted(businessId, 'branches');
    return res.status(200).json(new ApiResponse(200, { branch }, 'Branch updated'));
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

export const deleteBranch = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const branch = await BranchLocation.findOne({ where: { id: req.params.id, businessId } });
  if (!branch) throw new ApiError(404, 'Branch not found');
  await branch.update({ status: 'INACTIVE', isPrimary: false });
  return res.status(200).json(new ApiResponse(200, {}, 'Branch deleted'));
});

export const getDepartmentsDesignations = asyncHandler(async (req, res) => {
  const businessId = req.setupContext?.businessId || req.businessId;
  const [departments, designations, employees] = await Promise.all([
    Department.findAll({ where: { businessId, status: 'ACTIVE' }, order: [['name', 'ASC']] }),
    Designation.findAll({ where: { businessId, status: 'ACTIVE' }, order: [['name', 'ASC']] }),
    Employee.findAll({
      where: { businessId, isActive: true },
      attributes: ['id', 'firstName', 'lastName', 'empName', 'empDepartment', 'empDesignation'],
      order: [['firstName', 'ASC']],
    }),
  ]);
  return res.status(200).json(new ApiResponse(200, { departments, designations, employees }, 'Data retrieved'));
});

export const saveDepartmentsDesignations = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const { departments = [], designations = [] } = req.body || {};
  const t = await sequelize.transaction();
  const created = { departments: [], designations: [] };

  try {
    for (const dept of departments) {
      if (!dept.name?.trim()) continue;
      const existing = dept.id
        ? await Department.findOne({ where: { id: dept.id, businessId }, transaction: t })
        : null;
      if (existing) {
        await existing.update({
          name: dept.name.trim(),
          code: dept.code?.trim(),
          metadata: { ...(existing.metadata || {}), headEmployeeId: dept.headEmployeeId },
        }, { transaction: t });
        created.departments.push(existing);
      } else {
        const row = await Department.create({
          businessId,
          name: dept.name.trim(),
          code: dept.code?.trim(),
          status: 'ACTIVE',
          metadata: dept.headEmployeeId ? { headEmployeeId: dept.headEmployeeId } : {},
        }, { transaction: t });
        created.departments.push(row);
        await createAuditLog({ userId: req.user.id, businessId, action: 'DEPARTMENT_CREATED', newValue: row.toJSON(), ipAddress: getClientIp(req) });
      }
    }

    for (const des of designations) {
      if (!des.name?.trim()) continue;
      const existing = des.id
        ? await Designation.findOne({ where: { id: des.id, businessId }, transaction: t })
        : null;
      if (existing) {
        await existing.update({
          name: des.name.trim(),
          code: des.code?.trim(),
          metaData: { ...(existing.metaData || {}), level: des.level, departmentId: des.departmentId },
        }, { transaction: t });
        created.designations.push(existing);
      } else {
        const row = await Designation.create({
          businessId,
          name: des.name.trim(),
          code: des.code?.trim(),
          status: 'ACTIVE',
          metaData: { level: des.level, departmentId: des.departmentId },
        }, { transaction: t });
        created.designations.push(row);
        await createAuditLog({ userId: req.user.id, businessId, action: 'DESIGNATION_CREATED', newValue: row.toJSON(), ipAddress: getClientIp(req) });
      }
    }

    await t.commit();
    await markStepCompleted(businessId, 'departments_designations');
    return res.status(200).json(new ApiResponse(200, created, 'Departments and designations saved'));
  } catch (err) {
    await t.rollback();
    if (err?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json(new ApiResponse(409, {}, 'Duplicate department or designation name'));
    }
    throw err;
  }
});

export const getLeavePolicies = asyncHandler(async (req, res) => {
  const businessId = req.setupContext?.businessId || req.businessId;
  const leaveTypes = await LeaveType.findAll({
    where: { businessId, status: 'ACTIVE' },
    order: [['sortOrder', 'ASC'], ['name', 'ASC']],
  });
  return res.status(200).json(new ApiResponse(200, { leaveTypes }, 'Leave policies retrieved'));
});

export const saveLeavePolicies = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const policies = Array.isArray(req.body?.policies) ? req.body.policies : [req.body];
  const saved = [];

  for (const p of policies) {
    const errors = validateLeavePolicy(p);
    if (errors.length) {
      return res.status(400).json(new ApiResponse(400, { errors }, errors[0].message));
    }

    const policyConfig = {
      monthlyAccrual: !!p.monthlyAccrual,
      encashment: !!p.encashment,
      probationRestriction: !!p.probationRestriction,
      sandwichRule: !!p.sandwichRule,
      negativeAllowed: !!p.negativeAllowed,
      approvalFlow: p.approvalFlow || 'MANAGER_HR',
    };

    const payload = {
      name: p.name.trim(),
      code: p.code.trim().toUpperCase(),
      isPaid: p.isPaid !== false,
      maxPerYear: p.annualQuota ?? p.maxPerYear,
      allowCarryForward: !!p.allowCarryForward,
      maxCarryForward: p.maxCarryForward,
      policyConfig,
      status: 'ACTIVE',
    };

    let row;
    if (p.id) {
      row = await LeaveType.findOne({ where: { id: p.id, businessId } });
      if (row) await row.update(payload);
      else row = await LeaveType.create({ businessId, ...payload });
    } else {
      const dup = await LeaveType.findOne({ where: { businessId, code: payload.code } });
      if (dup) {
        return res.status(409).json(new ApiResponse(409, {}, `Leave code ${payload.code} already exists`));
      }
      row = await LeaveType.create({ businessId, ...payload });
      await createAuditLog({ userId: req.user.id, businessId, action: 'LEAVE_POLICY_CREATED', newValue: row.toJSON(), ipAddress: getClientIp(req) });
    }
    saved.push(row);
  }

  await markStepCompleted(businessId, 'leave_policies');
  return res.status(200).json(new ApiResponse(200, { leaveTypes: saved }, 'Leave policies saved'));
});

export const getAttendanceRules = asyncHandler(async (req, res) => {
  const businessId = req.setupContext?.businessId || req.businessId;
  const [rule, shifts] = await Promise.all([
    AttendanceRule.findOne({ where: { businessId } }),
    Shift.findAll({ where: { businessId, status: 'ACTIVE' }, order: [['name', 'ASC']] }),
  ]);
  return res.status(200).json(new ApiResponse(200, { rule, shifts }, 'Attendance rules retrieved'));
});

export const updateAttendanceRules = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const body = req.body || {};
  const errors = validateAttendanceRules(body);
  if (errors.length) {
    return res.status(400).json(new ApiResponse(400, { errors }, errors[0].message));
  }

  let shiftId = body.defaultShiftId;
  if (body.createDefaultShift) {
    const shift = await Shift.create({
      businessId,
      name: body.shiftName || 'General Shift',
      startTime: body.shiftStartTime || '09:00:00',
      endTime: body.shiftEndTime || '18:00:00',
      status: 'ACTIVE',
    });
    shiftId = shift.id;
  }

  const payload = {
    workWeekConfig: body.workWeekConfig || { type: body.workWeekType || 'MON_FRI', days: body.workWeekDays || [1, 2, 3, 4, 5] },
    defaultShiftId: shiftId,
    gracePeriodMinutes: body.gracePeriodMinutes ?? 10,
    halfDayThresholdHours: body.halfDayThresholdHours ?? 4,
    fullDayThresholdHours: body.fullDayThresholdHours ?? 8,
    autoAbsentEnabled: body.autoAbsentEnabled !== false,
    lateMarkAllowedCount: body.lateMarkAllowedCount ?? 3,
    overtimeEnabled: !!body.overtimeEnabled,
    geoAttendanceEnabled: !!body.geoAttendanceEnabled,
    selfieAttendanceEnabled: !!body.selfieAttendanceEnabled,
    regularizationAllowed: body.regularizationAllowed !== false,
    attendanceLockDay: body.attendanceLockDay,
  };

  let rule = await AttendanceRule.findOne({ where: { businessId } });
  const oldValue = rule?.toJSON();
  if (rule) await rule.update(payload);
  else rule = await AttendanceRule.create({ businessId, ...payload });

  await createAuditLog({ userId: req.user.id, businessId, action: 'ATTENDANCE_RULE_UPDATED', oldValue, newValue: rule.toJSON(), ipAddress: getClientIp(req) });
  await markStepCompleted(businessId, 'attendance_rules');
  return res.status(200).json(new ApiResponse(200, { rule }, 'Attendance rules updated'));
});

export const getSalaryComponents = asyncHandler(async (req, res) => {
  const businessId = req.setupContext?.businessId || req.businessId;
  const components = await SalaryComponent.findAll({
    where: { businessId },
    order: [['componentType', 'ASC'], ['name', 'ASC']],
  });
  return res.status(200).json(new ApiResponse(200, { components }, 'Salary components retrieved'));
});

export const saveSalaryComponent = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const body = req.body || {};
  const errors = validateSalaryComponent(body);
  if (errors.length) {
    return res.status(400).json(new ApiResponse(400, { errors }, errors[0].message));
  }

  const componentType = body.componentType || (body.type === 'DEDUCTION' ? 'deduction' : 'earning');
  const type = ['deduction', 'employer_contribution'].includes(componentType) ? 'DEDUCTION' : 'EARNING';

  const payload = {
    businessId,
    name: body.name.trim(),
    code: body.code.trim().toUpperCase(),
    type,
    componentType,
    calculationType: body.calculationType || 'FIXED',
    value: body.value,
    formula: body.formula,
    isTaxable: body.taxable != null ? !!body.taxable : !!body.isTaxable,
    showInPayslip: body.showInPayslip !== false,
    isDefault: !!body.isDefault,
    status: body.status || 'active',
    isStatutory: ['PF', 'ESI', 'PT', 'TDS'].includes(body.code?.toUpperCase()),
  };

  let row;
  if (req.params.id) {
    row = await SalaryComponent.findOne({ where: { id: req.params.id, businessId } });
    if (!row) throw new ApiError(404, 'Component not found');
    await row.update(payload);
  } else {
    const dup = await SalaryComponent.findOne({ where: { businessId, code: payload.code } });
    if (dup) return res.status(409).json(new ApiResponse(409, {}, 'Component code already exists'));
    row = await SalaryComponent.create(payload);
    await createAuditLog({ userId: req.user.id, businessId, action: 'SALARY_COMPONENT_CREATED', newValue: row.toJSON(), ipAddress: getClientIp(req) });
  }

  await markStepCompleted(businessId, 'salary_components');
  return res.status(201).json(new ApiResponse(201, { component: row }, 'Salary component saved'));
});

export const deleteSalaryComponent = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const row = await SalaryComponent.findOne({ where: { id: req.params.id, businessId } });
  if (!row) throw new ApiError(404, 'Component not found');
  await row.update({ status: 'inactive' });
  return res.status(200).json(new ApiResponse(200, {}, 'Component deactivated'));
});

export const getStatutory = asyncHandler(async (req, res) => {
  const businessId = req.setupContext?.businessId || req.businessId;
  const canEdit = req.setupContext?.canEdit ?? false;
  const statutory = await OrganizationStatutorySetting.findOne({ where: { businessId } });
  const business = await Business.findByPk(businessId, { attributes: ['tanNumber', 'panNumber'] });
  const data = sanitizeStatutoryForView(statutory, canEdit);
  if (data && !data.tanNumber && business?.tanNumber) data.tanNumber = business.tanNumber;
  return res.status(200).json(new ApiResponse(200, { statutory: data }, 'Statutory settings retrieved'));
});

export const updateStatutory = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const body = req.body || {};
  const errors = validateStatutory(body);
  if (errors.length) {
    return res.status(400).json(new ApiResponse(400, { errors }, errors[0].message));
  }

  let statutory = await OrganizationStatutorySetting.findOne({ where: { businessId } });
  const oldValue = statutory?.toJSON();
  const payload = {
    pfEnabled: !!body.pfEnabled,
    pfEstablishmentNumber: body.pfEstablishmentNumber?.trim(),
    employeePfRate: body.employeePfRate ?? 12,
    employerPfRate: body.employerPfRate ?? 12,
    esiEnabled: !!body.esiEnabled,
    esiEmployerCode: body.esiEmployerCode?.trim(),
    ptEnabled: !!body.ptEnabled,
    ptState: body.ptState,
    tdsEnabled: !!body.tdsEnabled,
    tanNumber: body.tanNumber?.trim().toUpperCase(),
    payrollBankAccountName: body.payrollBankAccountName,
    payrollBankAccountNumber: body.payrollBankAccountNumber,
    payrollBankIfsc: body.payrollBankIfsc?.trim().toUpperCase(),
    payrollBankName: body.payrollBankName,
    payrollBankBranch: body.payrollBankBranch,
  };

  if (statutory) await statutory.update(payload);
  else statutory = await OrganizationStatutorySetting.create({ businessId, ...payload });

  if (body.tanNumber) {
    await Business.update({ tanNumber: body.tanNumber.trim().toUpperCase() }, { where: { id: businessId } });
  }

  // Sync to PayrollSetting for existing payroll module
  let payrollSetting = await PayrollSetting.findOne({ where: { businessId } });
  const bankDetails = {
    accountName: payload.payrollBankAccountName,
    accountNumber: payload.payrollBankAccountNumber,
    ifsc: payload.payrollBankIfsc,
    bankName: payload.payrollBankName,
    branch: payload.payrollBankBranch,
  };
  const statutoryConfig = {
    PF: payload.pfEnabled,
    ESI: payload.esiEnabled,
    PT: payload.ptEnabled,
    TDS: payload.tdsEnabled,
    pfEstablishmentNumber: payload.pfEstablishmentNumber,
    esiEmployerCode: payload.esiEmployerCode,
    tanNumber: payload.tanNumber,
  };
  if (payrollSetting) {
    await payrollSetting.update({ statutoryConfig, bankDetails });
  } else {
    await PayrollSetting.create({ businessId, statutoryConfig, bankDetails });
  }

  await createAuditLog({ userId: req.user.id, businessId, action: 'STATUTORY_SETTING_UPDATED', oldValue, newValue: statutory.toJSON(), ipAddress: getClientIp(req) });
  await markStepCompleted(businessId, 'statutory');
  return res.status(200).json(new ApiResponse(200, { statutory }, 'Statutory settings updated'));
});

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

export const inviteEmployees = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const employees = Array.isArray(req.body?.employees) ? req.body.employees : [req.body];
  const sendEmail = req.body?.sendInvitationEmail !== false;
  const created = [];

  for (const emp of employees) {
    const emailErr = validateEmail(emp.email || emp.empEmail);
    if (emailErr) {
      return res.status(400).json(new ApiResponse(400, {}, emailErr));
    }
    const email = (emp.email || emp.empEmail).trim().toLowerCase();
    const dup = await Employee.findOne({ where: { businessId, empEmail: email } });
    if (dup) {
      return res.status(409).json(new ApiResponse(409, {}, `Employee with email ${email} already exists`));
    }

    const nameParts = String(emp.name || '').trim().split(/\s+/);
    const firstName = emp.firstName || nameParts[0] || 'New';
    const lastName = emp.lastName || nameParts.slice(1).join(' ') || 'Employee';

    const row = await Employee.create({
      businessId,
      firstName,
      lastName,
      empName: emp.name || `${firstName} ${lastName}`.trim(),
      empEmail: email,
      empPhone: emp.phone || emp.empPhone || '',
      empDepartment: emp.department || emp.empDepartment || 'General',
      empDesignation: emp.designation || emp.empDesignation || 'Unassigned',
      reportingManagerId: emp.managerId || emp.reportingManagerId || null,
      empDateOfJoining: emp.doj || emp.empDateOfJoining || todayDateOnly(),
      empCtc: emp.salary || emp.empCtc || 0,
      isActive: true,
      lifecycleStage: 'invited',
      accountStatus: sendEmail ? 'invited' : 'draft',
    });
    created.push(row);
    await createAuditLog({ userId: req.user.id, businessId, action: 'EMPLOYEE_INVITED', newValue: { id: row.id, email }, ipAddress: getClientIp(req) });
  }

  await markStepCompleted(businessId, 'invite_employees');
  return res.status(201).json(new ApiResponse(201, { employees: created, sendEmail }, 'Employees invited'));
});

export const inviteEmployeesCsv = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  if (!req.file) {
    return res.status(400).json(new ApiResponse(400, {}, 'CSV file is required'));
  }

  const text = req.file.buffer.toString('utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return res.status(400).json(new ApiResponse(400, {}, 'CSV must have header and at least one row'));
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const employees = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = cols[idx]; });
    employees.push({
      name: row.name,
      email: row.email,
      phone: row.phone,
      department: row.department,
      designation: row.designation,
      managerId: row.manager,
      doj: row.doj,
      salary: row.salary,
    });
  }

  const sendEmail = req.body?.sendInvitationEmail !== 'false';
  const created = [];

  for (const emp of employees) {
    const emailErr = validateEmail(emp.email);
    if (emailErr) continue;
    const email = emp.email.trim().toLowerCase();
    const dup = await Employee.findOne({ where: { businessId, empEmail: email } });
    if (dup) continue;

    const nameParts = String(emp.name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || 'New';
    const lastName = nameParts.slice(1).join(' ') || 'Employee';

    const row = await Employee.create({
      businessId,
      firstName,
      lastName,
      empName: emp.name || `${firstName} ${lastName}`.trim(),
      empEmail: email,
      empPhone: emp.phone || '',
      empDepartment: emp.department || 'General',
      empDesignation: emp.designation || 'Unassigned',
      reportingManagerId: emp.managerId || null,
      empDateOfJoining: emp.doj || todayDateOnly(),
      empCtc: emp.salary || 0,
      isActive: true,
      lifecycleStage: 'invited',
      accountStatus: sendEmail ? 'invited' : 'draft',
    });
    created.push(row);
    await createAuditLog({ userId: req.user.id, businessId, action: 'EMPLOYEE_INVITED', newValue: { id: row.id, email }, ipAddress: getClientIp(req) });
  }

  await markStepCompleted(businessId, 'invite_employees');
  return res.status(201).json(new ApiResponse(201, { employees: created, count: created.length }, 'CSV employees imported'));
});

export const downloadSampleCsv = asyncHandler(async (req, res) => {
  const csv = 'name,email,phone,department,designation,manager,doj,salary\nJohn Doe,john@example.com,9999999999,Engineering,Developer,,2025-01-15,500000\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=employee-invite-sample.csv');
  return res.send(csv);
});

export const skipSetupStep = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const { stepKey, reason } = req.body || {};
  if (!stepKey) throw new ApiError(400, 'stepKey is required');
  if (stepKey !== 'invite_employees') {
    return res.status(400).json(new ApiResponse(400, {}, 'Only invite_employees step can be skipped'));
  }
  await skipStep(businessId, stepKey, reason);
  await createAuditLog({ userId: req.user.id, businessId, action: 'SETUP_STEP_COMPLETED', newValue: { skipped: stepKey, reason }, ipAddress: getClientIp(req) });
  const status = await getSetupStatus(businessId);
  return res.status(200).json(new ApiResponse(200, status, 'Step skipped'));
});

export const completeSetupStep = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const { stepKey } = req.body || {};
  if (!stepKey) throw new ApiError(400, 'stepKey is required');
  await markStepCompleted(businessId, stepKey);
  await createAuditLog({ userId: req.user.id, businessId, action: 'SETUP_STEP_COMPLETED', newValue: { stepKey }, ipAddress: getClientIp(req) });
  const status = await getSetupStatus(businessId);
  return res.status(200).json(new ApiResponse(200, status, 'Step marked complete'));
});

export const finishSetupHandler = asyncHandler(async (req, res) => {
  const businessId = req.businessId;
  const status = await getSetupStatus(businessId);
  if (!status.canFinish) {
    return res.status(422).json(new ApiResponse(422, {
      missingItems: status.criticalMissing,
      score: status.score,
    }, 'Cannot finish setup — critical items are missing'));
  }
  await finishSetup(businessId);
  await createAuditLog({ userId: req.user.id, businessId, action: 'SETUP_FINISHED', newValue: { score: status.score }, ipAddress: getClientIp(req) });
  const finalStatus = await getSetupStatus(businessId);
  finalStatus.setupCompleted = true;
  return res.status(200).json(new ApiResponse(200, finalStatus, 'Setup completed successfully'));
});

export { seedDefaultSetupData, ensureSetupProgress };
