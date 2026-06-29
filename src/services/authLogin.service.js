import { Op } from 'sequelize';
import Employee from '../models/Employee.js';
import { Business } from '../models/Business.js';
import { User } from '../models/User.js';
import { buildTokenPair, hashToken } from '../utils/token.util.js';
import { buildEmployeeTokenPair } from '../utils/employeeToken.util.js';
import { resolveDefaultOrganizationIdForUser } from './organization.service.js';

const EMPLOYEE_CODE_RE = /^EMP[A-Z0-9]+$/i;

/** User roles that open the HR admin portal (/dashboard). */
export const HR_PORTAL_USER_ROLES = new Set([
  'admin',
  'SUPER_ADMIN',
  'shop_owner',
  'shop_manager',
  'shop_worker',
  'HR_MANAGER',
  'HR_EXECUTIVE',
  'FINANCE',
  'MANAGER',
]);

export function isEmployeeCode(identifier) {
  return EMPLOYEE_CODE_RE.test(String(identifier || '').trim());
}

export function isHrPortalUserRole(role) {
  return HR_PORTAL_USER_ROLES.has(String(role || ''));
}

export function getRedirectForAccountType(accountType) {
  return accountType === 'employee' ? '/employee/dashboard' : '/dashboard';
}

async function findEmployeeByIdentifier(identifier) {
  const raw = String(identifier || '').trim();
  if (!raw) return null;

  return Employee.findOne({
    where: {
      [Op.or]: [
        { empEmail: raw.toLowerCase() },
        { workEmail: raw.toLowerCase() },
        { empId: raw.toUpperCase() },
      ],
    },
    include: [
      {
        model: Business,
        as: 'business',
        attributes: ['id', 'businessName'],
      },
    ],
  });
}

function buildEmployeePayload(employee) {
  return {
    id: employee.id,
    empId: employee.empId,
    empName: employee.empName,
    firstName: employee.firstName,
    lastName: employee.lastName,
    empEmail: employee.empEmail,
    empDepartment: employee.empDepartment,
    empDesignation: employee.empDesignation,
    role: employee.role,
    businessId: employee.businessId,
    businessName: employee.business?.businessName,
  };
}

async function finalizeHrLogin(user) {
  const { accessToken, refreshToken, refreshExp } = buildTokenPair(user.id);

  user.refreshTokens = hashToken(refreshToken);
  user.refreshTokenExpiresAt = refreshExp ? new Date(refreshExp * 1000) : null;
  await user.save();

  const defaultOrgId = await resolveDefaultOrganizationIdForUser(user);

  return {
    ok: true,
    accountType: 'hr',
    redirectTo: getRedirectForAccountType('hr'),
    user,
    tokens: { accessToken, refreshToken },
    refreshExp,
    defaultOrgId,
  };
}

async function finalizeEmployeeLogin(employee) {
  const { accessToken, refreshToken, refreshExp } = buildEmployeeTokenPair(
    employee.id,
    employee.businessId
  );

  employee.employeeRefreshToken = hashToken(refreshToken);
  employee.employeeRefreshTokenExpiresAt = refreshExp ? new Date(refreshExp * 1000) : null;
  employee.lastEmployeeLoginAt = new Date();
  await employee.save();

  return {
    ok: true,
    accountType: 'employee',
    redirectTo: getRedirectForAccountType('employee'),
    employee: buildEmployeePayload(employee),
    tokens: { accessToken, refreshToken },
    refreshExp,
  };
}

function employeeLoginBlockedReason(employee) {
  if (!employee) return 'not_found';
  if (!employee.canLogin) return 'noaccess';
  if (!employee.isActive) return 'inactive';
  if (!employee.password) return 'no_password';
  return null;
}

export async function authenticateHrUser(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    return { ok: false, reason: 'missing_identifier' };
  }

  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) {
    return { ok: false, reason: 'not_found' };
  }

  const isValid = await user.isPasswordCorrect(password);
  if (!isValid) {
    return { ok: false, reason: 'invalid_password' };
  }

  return finalizeHrLogin(user);
}

export async function authenticateEmployee(identifier, password) {
  const raw = String(identifier || '').trim();
  if (!raw) {
    return { ok: false, reason: 'missing_identifier' };
  }

  const employee = await findEmployeeByIdentifier(raw);
  const blocked = employeeLoginBlockedReason(employee);
  if (blocked) {
    return { ok: false, reason: blocked };
  }

  const isValid = await employee.isPasswordCorrect(password);
  if (!isValid) {
    return { ok: false, reason: 'invalid_password' };
  }

  return finalizeEmployeeLogin(employee);
}

/**
 * Single login resolver:
 * - EMP code -> employee portal
 * - email in users table with HR role -> HR portal
 * - email in users table with EMPLOYEE role -> employee portal (if employee record exists)
 * - email only in employees table -> employee portal
 */
export async function resolveUnifiedLogin(identifier, password) {
  const trimmed = String(identifier || '').trim();

  if (!trimmed || !password) {
    return { ok: false, reason: 'missing_identifier' };
  }

  if (isEmployeeCode(trimmed)) {
    return authenticateEmployee(trimmed, password);
  }

  const normalizedEmail = trimmed.toLowerCase();
  const user = await User.findOne({ where: { email: normalizedEmail } });
  const employee = await findEmployeeByIdentifier(trimmed);

  if (user) {
    const userPasswordOk = await user.isPasswordCorrect(password);
    const blocked = employeeLoginBlockedReason(employee);
    let employeePasswordOk = false;

    if (!blocked) {
      employeePasswordOk = await employee.isPasswordCorrect(password);
    }

    if (userPasswordOk && isHrPortalUserRole(user.role)) {
      return finalizeHrLogin(user);
    }

    if (employeePasswordOk) {
      return finalizeEmployeeLogin(employee);
    }

    if (userPasswordOk) {
      return finalizeHrLogin(user);
    }

    return { ok: false, reason: 'invalid_password' };
  }

  return authenticateEmployee(trimmed, password);
}

export function loginErrorMessage(result) {
  switch (result.reason) {
    case 'missing_identifier':
      return 'Email/employee code and password are required';
    case 'invalid_password':
    case 'not_found':
      return 'Invalid email or password';
    case 'noaccess':
      return 'Portal access not enabled. Please contact HR.';
    case 'inactive':
      return 'Your account has been deactivated';
    case 'no_password':
      return 'Password not set. Please contact HR.';
    default:
      return 'Login failed';
  }
}

export function loginErrorStatus(result) {
  if (result.reason === 'noaccess' || result.reason === 'inactive') return 403;
  if (result.reason === 'missing_identifier') return 400;
  return 401;
}

export function buildLoginSuccessPayload(result) {
  if (result.accountType === 'hr') {
    return {
      accountType: 'hr',
      role: result.user.role,
      redirectTo: result.redirectTo,
      tokens: result.tokens,
      user: {
        id: result.user.id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
        role: result.user.role,
        status: result.user.status,
      },
    };
  }

  return {
    accountType: 'employee',
    role: result.employee.role,
    redirectTo: result.redirectTo,
    tokens: result.tokens,
    employee: result.employee,
  };
}
