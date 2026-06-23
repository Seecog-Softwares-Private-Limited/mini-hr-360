// src/controllers/employee/employeeAuth.controller.js
import { Op } from 'sequelize';
import Employee from '../../models/Employee.js';
import { Business } from '../../models/Business.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { hashToken } from '../../utils/token.util.js';
import { buildEmployeeTokenPair } from '../../utils/employeeToken.util.js';
import { clearEmployeeAuthCookies, setEmployeeAuthCookies } from '../../utils/authCookie.util.js';
import { rotateEmployeeSession } from '../../services/employeeSession.service.js';

/**
 * GET /employee/login - Render login page
 */
export const renderEmployeeLogin = (req, res) => {
  const error = req.query.error;
  let errorMessage = null;

  if (error === 'inactive') {
    errorMessage = 'Your account has been deactivated. Please contact HR.';
  } else if (error === 'noaccess') {
    errorMessage = 'You do not have portal access. Please contact HR.';
  }

  res.render('employee/login', {
    title: 'Employee Login',
    pageClass: 'auth',
    layout: 'employee-main',
    errorMessage,
  });
};

/**
 * POST /employee/login - Handle employee login
 * Supports login via email OR employee code + password
 */
export const loginEmployee = asyncHandler(async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/Employee Code and Password are required',
      });
    }

    // Find employee by email OR employee code (empId)
    const employee = await Employee.findOne({
      where: {
        [Op.or]: [
          { empEmail: identifier.toLowerCase() },
          { workEmail: identifier.toLowerCase() },
          { empId: identifier.toUpperCase() },
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

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: 'No employee found with this email or code',
      });
    }

    // Check if employee can login
    if (!employee.canLogin) {
      return res.status(403).json({
        success: false,
        message: 'Portal access not enabled',
        error: 'Please contact HR to enable portal access',
      });
    }

    // Check if employee is active
    if (!employee.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account inactive',
        error: 'Your account has been deactivated',
      });
    }

    // Check if employee has a password set
    if (!employee.password) {
      return res.status(401).json({
        success: false,
        message: 'Password not set',
        error: 'Please contact HR to set up your password',
      });
    }

    // Verify password
    const isValid = await employee.isPasswordCorrect(password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: 'Incorrect password',
      });
    }

    // Generate tokens
    const { accessToken, refreshToken, refreshExp } = buildEmployeeTokenPair(
      employee.id,
      employee.businessId
    );

    // Update employee with refresh token
    employee.employeeRefreshToken = hashToken(refreshToken);
    employee.employeeRefreshTokenExpiresAt = refreshExp ? new Date(refreshExp * 1000) : null;
    employee.lastEmployeeLoginAt = new Date();
    await employee.save();

    setEmployeeAuthCookies(res, accessToken, refreshToken, refreshExp);

    const employeeData = {
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

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          tokens: { accessToken, refreshToken },
          employee: employeeData,
        },
        'Login successful'
      )
    );
  } catch (error) {
    console.error('Employee login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

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

    return res.redirect('/employee/login');
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
