// src/controllers/employee/employeeDashboard.controller.js
import { Op } from 'sequelize';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { LeaveRequest, LeaveType, Employee, Business } from '../../models/index.js';
import { getLeaveStats, getAllLeaveBalances } from '../../services/leave.service.js';

/**
 * GET /employee/dashboard - Render employee dashboard
 */
export const renderEmployeeDashboard = asyncHandler(async (req, res) => {
  const employee = req.employee;
  const businessId = employee.businessId;

  // Get leave statistics
  const leaveStats = await getLeaveStats(employee.id, businessId);

  // Get recent leave requests (last 5)
  const recentRequests = await LeaveRequest.findAll({
    where: { employeeId: employee.id },
    include: [{ model: LeaveType, as: 'leaveType', attributes: ['name', 'code', 'color'] }],
    order: [['createdAt', 'DESC']],
    limit: 5,
  });

  // Get upcoming approved leaves
  const today = new Date().toISOString().split('T')[0];
  const upcomingLeaves = await LeaveRequest.findAll({
    where: {
      employeeId: employee.id,
      status: 'APPROVED',
      startDate: { [Op.gte]: today },
    },
    include: [{ model: LeaveType, as: 'leaveType', attributes: ['name', 'code', 'color'] }],
    order: [['startDate', 'ASC']],
    limit: 5,
  });

  // Get business info
  const business = await Business.findByPk(businessId);

  // Format data for template
  const dashboardData = {
    employee: {
      id: employee.id,
      empId: employee.empId,
      empName: employee.empName,
      firstName: employee.firstName,
      lastName: employee.lastName,
      empEmail: employee.empEmail,
      empDepartment: employee.empDepartment,
      empDesignation: employee.empDesignation,
      empDateOfJoining: employee.empDateOfJoining,
      empPhone: employee.empPhone,
      role: employee.role,
    },
    business: business ? {
      id: business.id,
      name: business.businessName,
    } : null,
    leaveStats: {
      pendingCount: leaveStats.pendingCount,
      approvedThisMonth: leaveStats.approvedThisMonth,
      balances: leaveStats.balances,
    },
    recentRequests: recentRequests.map(r => ({
      id: r.id,
      leaveType: r.leaveType?.name,
      leaveTypeColor: r.leaveType?.color || '#6366f1',
      startDate: r.startDate,
      endDate: r.endDate,
      totalDays: r.totalDays,
      status: r.status,
      createdAt: r.createdAt,
    })),
    upcomingLeaves: upcomingLeaves.map(r => ({
      id: r.id,
      leaveType: r.leaveType?.name,
      leaveTypeColor: r.leaveType?.color || '#6366f1',
      startDate: r.startDate,
      endDate: r.endDate,
      totalDays: r.totalDays,
    })),
  };

  res.render('employee/dashboard', {
    title: 'Employee Dashboard',
    layout: 'employee-main',
    active: 'dashboard',
    ...dashboardData,
  });
});

/**
 * GET /api/employee/dashboard/stats - Get dashboard stats (API)
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const employee = req.employee;
  const businessId = employee.businessId;

  const leaveStats = await getLeaveStats(employee.id, businessId);

  return res.json({
    success: true,
    data: {
      employee: {
        id: employee.id,
        empId: employee.empId,
        empName: employee.empName,
        empDepartment: employee.empDepartment,
        empDesignation: employee.empDesignation,
      },
      leaveStats,
    },
  });
});

/**
 * GET /api/employee/profile - Get employee profile
 */
export const getEmployeeProfile = asyncHandler(async (req, res) => {
  const employee = await Employee.findByPk(req.employee.id, {
    attributes: { exclude: ['password', 'employeeRefreshToken', 'employeeRefreshTokenExpiresAt'] },
    include: [{ model: Business, as: 'business', attributes: ['id', 'businessName'] }],
  });

  return res.json({
    success: true,
    data: employee,
  });
});

export default {
  renderEmployeeDashboard,
  getDashboardStats,
  getEmployeeProfile,
};
