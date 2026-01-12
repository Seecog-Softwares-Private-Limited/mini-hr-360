// src/controllers/employee/employeeAuth.controller.js
import { Op } from 'sequelize';
import Employee from '../../models/Employee.js';
import { Business } from '../../models/Business.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { hashToken } from '../../utils/token.util.js';
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '60m';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '7d';

/**
 * Generate employee-specific tokens with employeeId claim
 */
function buildEmployeeTokenPair(employeeId, businessId) {
  const accessToken = jwt.sign(
    { employeeId: employeeId.toString(), businessId: businessId?.toString(), type: 'employee' },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
  const refreshToken = jwt.sign(
    { employeeId: employeeId.toString(), businessId: businessId?.toString(), type: 'employee' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );

  const decoded = jwt.decode(refreshToken);
  const refreshExp = decoded?.exp ?? null;

  return { accessToken, refreshToken, refreshExp };
}

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

    // Calculate maxAge
    let maxAgeSeconds;
    if (refreshExp) {
      const remainingMs = refreshExp * 1000 - Date.now();
      maxAgeSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    } else {
      maxAgeSeconds = 7 * 24 * 60 * 60;
    }

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: maxAgeSeconds * 1000,
      path: '/',
    };

    // Return employee data (without sensitive fields)
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

    return res
      .status(200)
      .cookie('employeeAccessToken', accessToken, cookieOptions)
      .cookie('employeeRefreshToken', refreshToken, cookieOptions)
      .json(
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

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      expires: new Date(0),
    };

    // Check if this is an API request or page navigation
    const wantsJson =
      req.xhr ||
      String(req.headers?.accept || '').includes('application/json') ||
      String(req.headers?.['x-requested-with'] || '').toLowerCase() === 'xmlhttprequest';

    res.cookie('employeeAccessToken', '', cookieOptions);
    res.cookie('employeeRefreshToken', '', cookieOptions);

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
  logoutEmployee,
};
