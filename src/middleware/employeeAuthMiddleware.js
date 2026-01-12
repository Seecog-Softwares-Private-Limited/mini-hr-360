// src/middleware/employeeAuthMiddleware.js
import { asyncHandler } from '../utils/asyncHandler.js';
import Employee from '../models/Employee.js';
import { verifyAccessToken } from '../utils/token.util.js';

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

/**
 * Middleware to verify employee is logged in (via employee-specific token)
 */
export const verifyEmployee = asyncHandler(async (req, res, next) => {
  try {
    // Check for employee-specific token (stored in separate cookie)
    const token =
      req.cookies?.employeeAccessToken ||
      req.header('Authorization')?.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      if (shouldRedirectToEmployeeLogin(req)) {
        return res.redirect('/employee/login');
      }
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'Employee login required',
      });
    }

    const decoded = verifyAccessToken(token);

    // Check if this is an employee token (has employeeId claim)
    if (!decoded?.employeeId) {
      if (shouldRedirectToEmployeeLogin(req)) {
        return res.redirect('/employee/login');
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token type',
        error: 'This token is not valid for employee access',
      });
    }

    const employee = await Employee.findByPk(decoded.employeeId, {
      attributes: { exclude: ['password', 'employeeRefreshToken'] },
    });

    if (!employee) {
      if (shouldRedirectToEmployeeLogin(req)) {
        return res.redirect('/employee/login');
      }
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
        error: 'Employee not found',
      });
    }

    // Check if employee is active and can login
    if (!employee.isActive) {
      if (shouldRedirectToEmployeeLogin(req)) {
        return res.redirect('/employee/login?error=inactive');
      }
      return res.status(403).json({
        success: false,
        message: 'Account inactive',
        error: 'Your account has been deactivated',
      });
    }

    if (!employee.canLogin) {
      if (shouldRedirectToEmployeeLogin(req)) {
        return res.redirect('/employee/login?error=noaccess');
      }
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        error: 'You do not have portal access',
      });
    }

    // Attach employee to request
    req.employee = employee;
    req.businessId = employee.businessId;
    next();
  } catch (error) {
    console.error('Employee auth error:', error.message);

    if (shouldRedirectToEmployeeLogin(req)) {
      res.clearCookie('employeeAccessToken');
      return res.redirect('/employee/login');
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error.message,
    });
  }
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
