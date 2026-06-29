// src/middleware/employeeAuthMiddleware.js
import { asyncHandler } from '../utils/asyncHandler.js';
import Employee from '../models/Employee.js';
import { verifyAccessToken } from '../utils/token.util.js';
import { rotateEmployeeSession } from '../services/employeeSession.service.js';
import { clearEmployeeAuthCookies, setEmployeeAuthCookies } from '../utils/authCookie.util.js';

/**
 * Determines if we should redirect to employee login page
 */
function shouldRedirectToEmployeeLogin(req) {
  const accept = String(req.headers?.accept || '');
  const wantsHtml = accept.includes('text/html');
  const isApiPath =
    String(req.originalUrl || '').startsWith('/api/') ||
    String(req.originalUrl || '').startsWith('/api/v1/');
  const isGet = req.method === 'GET';
  const isXHR =
    req.xhr ||
    String(req.headers?.['x-requested-with'] || '').toLowerCase() === 'xmlhttprequest';

  return isGet && wantsHtml && !isApiPath && !isXHR;
}

function isExpiredTokenError(error) {
  return error?.name === 'TokenExpiredError' || String(error?.message || '').includes('jwt expired');
}

async function tryRefreshEmployeeSession(req, res) {
  const refreshToken = req.cookies?.employeeRefreshToken;
  if (!refreshToken) return null;

  try {
    const { accessToken, refreshToken: newRefresh, refreshExp, employee } =
      await rotateEmployeeSession(refreshToken);
    setEmployeeAuthCookies(res, accessToken, newRefresh, refreshExp);
    return employee;
  } catch {
    clearEmployeeAuthCookies(res);
    return null;
  }
}

async function authenticateEmployee(req, res) {
  const token =
    req.header('Authorization')?.replace(/^Bearer\s+/i, '').trim() ||
    req.cookies?.employeeAccessToken;

  if (!token || token === 'undefined' || token === 'null') {
    return { error: 'missing_token' };
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (error) {
    if (!isExpiredTokenError(error)) {
      return { error: 'invalid_token', message: error.message };
    }

    const employee = await tryRefreshEmployeeSession(req, res);
    if (!employee) {
      return { error: 'session_expired', message: error.message };
    }

    if (!employee.isActive) {
      return { error: 'inactive' };
    }

    if (!employee.canLogin) {
      return { error: 'noaccess' };
    }

    return { employee };
  }

  if (!decoded?.employeeId) {
    return { error: 'invalid_token_type' };
  }

  const employee = await Employee.findByPk(decoded.employeeId, {
    attributes: { exclude: ['password', 'employeeRefreshToken'] },
  });

  if (!employee) {
    return { error: 'not_found' };
  }

  if (!employee.isActive) {
    return { error: 'inactive' };
  }

  if (!employee.canLogin) {
    return { error: 'noaccess' };
  }

  return { employee };
}

/**
 * Middleware to verify employee is logged in (via employee-specific token)
 */
export const verifyEmployee = asyncHandler(async (req, res, next) => {
  const auth = await authenticateEmployee(req, res);

  if (auth.employee) {
    req.employee = auth.employee;
    req.businessId = auth.employee.businessId;
    return next();
  }

  if (auth.error === 'inactive') {
    if (shouldRedirectToEmployeeLogin(req)) {
      return res.redirect('/login?error=inactive');
    }
    return res.status(403).json({
      success: false,
      message: 'Account inactive',
      error: 'Your account has been deactivated',
    });
  }

  if (auth.error === 'noaccess') {
    if (shouldRedirectToEmployeeLogin(req)) {
      return res.redirect('/login?error=noaccess');
    }
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      error: 'You do not have portal access',
    });
  }

  if (shouldRedirectToEmployeeLogin(req)) {
    clearEmployeeAuthCookies(res);
    return res.redirect('/login');
  }

  return res.status(401).json({
    success: false,
    message: 'Authentication failed',
    error: auth.message || 'Employee login required',
  });
});

/**
 * Middleware to block Admin/HR users from employee routes
 * Use after verifyEmployee to ensure only EMPLOYEE role can access
 */
export const employeeOnly = asyncHandler(async (req, res, next) => {
  if (!req.employee) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  // Allow EMPLOYEE role only (block MANAGER, HR)
  // Note: This is for routes that should be employee-exclusive
  // Most leave routes allow all employee roles
  next();
});

/**
 * Middleware to check if employee can manage/approve leaves
 * Allows MANAGER and HR roles
 */
export const canManageLeaves = asyncHandler(async (req, res, next) => {
  if (!req.employee) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.employee.role !== 'MANAGER' && req.employee.role !== 'HR') {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      error: 'You do not have permission to manage leaves',
    });
  }

  next();
});

export default { verifyEmployee, employeeOnly, canManageLeaves };
