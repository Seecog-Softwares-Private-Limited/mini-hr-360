// src/controllers/employee/employeeAuth.controller.js
import Employee from '../../models/Employee.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { clearEmployeeAuthCookies, setEmployeeAuthCookies } from '../../utils/authCookie.util.js';
import { rotateEmployeeSession } from '../../services/employeeSession.service.js';
import { unifiedLogin } from '../auth/unifiedLogin.controller.js';

/**
 * GET /employee/login - Render login page
 */
export const renderEmployeeLogin = (req, res) => {
  const params = new URLSearchParams();
  if (req.query.error) params.set('error', req.query.error);
  const query = params.toString();
  return res.redirect(query ? `/login?${query}` : '/login');
};

/** POST /employee/login - backward-compatible alias for unified login */
export const loginEmployee = unifiedLogin;

/**
 * POST /employee/refresh - Rotate employee session tokens
 */
export const refreshEmployee = asyncHandler(async (req, res) => {
  try {
    const refreshToken =
      req.cookies?.employeeRefreshToken ||
      req.body?.refreshToken ||
      req.header('x-refresh-token')?.trim();

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'refreshToken required' });
    }

    const { accessToken, refreshToken: newRefresh, refreshExp, employee } =
      await rotateEmployeeSession(refreshToken);

    setEmployeeAuthCookies(res, accessToken, newRefresh, refreshExp);

    const safeEmployee = await Employee.findByPk(employee.id, {
      attributes: { exclude: ['password', 'employeeRefreshToken', 'employeeRefreshTokenExpiresAt'] },
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        { tokens: { accessToken, refreshToken: newRefresh }, employee: safeEmployee },
        'Token refreshed'
      )
    );
  } catch (error) {
    if (error.code) {
      clearEmployeeAuthCookies(res);
      return res.status(401).json({ success: false, message: error.message });
    }

    console.error('Employee refresh error:', error);
    return res.status(500).json({ success: false, message: 'internal_error' });
  }
});

/**
 * GET /employee/logout - Logout employee
 */
export const logoutEmployee = asyncHandler(async (req, res) => {
  try {
    if (req.employee) {
      const employee = await Employee.findByPk(req.employee.id);
      if (employee) {
        employee.employeeRefreshToken = null;
        employee.employeeRefreshTokenExpiresAt = null;
        await employee.save();
      }
    }

    // Check if this is an API request or page navigation
    const wantsJson =
      req.xhr ||
      String(req.headers?.accept || '').includes('application/json') ||
      String(req.headers?.['x-requested-with'] || '').toLowerCase() === 'xmlhttprequest';

    clearEmployeeAuthCookies(res);

    if (wantsJson) {
      return res.status(200).json(new ApiResponse(200, null, 'Logout successful'));
    }

    return res.redirect('/login');
  } catch (error) {
    console.error('Employee logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

export default {
  renderEmployeeLogin,
  loginEmployee,
  refreshEmployee,
  logoutEmployee,
};
