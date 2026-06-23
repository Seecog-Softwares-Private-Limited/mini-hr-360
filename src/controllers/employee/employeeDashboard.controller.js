import { Op } from 'sequelize';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { LeaveRequest, LeaveType, Employee, Business } from '../../models/index.js';
import { getLeaveStats } from '../../services/leave.service.js';
import { getEffectiveAssignment } from '../../services/attendance.service.js';
import {
  getEmployeeDashboardOverview,
  parseSkills,
  buildCareerJourney,
  getCertificates,
} from '../../services/employeeDashboard.service.js';

/**
 * GET /employee/dashboard - Render employee dashboard
 */
export const renderEmployeeDashboard = asyncHandler(async (req, res) => {
  const employee = req.employee;
  const businessId = employee.businessId;

  const [leaveStats, overview, recentRequests, upcomingLeaves, business] = await Promise.all([
    getLeaveStats(employee.id, businessId),
    getEmployeeDashboardOverview(employee),
    LeaveRequest.findAll({
      where: { employeeId: employee.id },
      include: [{ model: LeaveType, as: 'leaveType', attributes: ['name', 'code', 'color'] }],
      order: [['createdAt', 'DESC']],
      limit: 5,
    }),
    LeaveRequest.findAll({
      where: {
        employeeId: employee.id,
        status: 'APPROVED',
        startDate: { [Op.gte]: new Date().toISOString().split('T')[0] },
      },
      include: [{ model: LeaveType, as: 'leaveType', attributes: ['name', 'code', 'color'] }],
      order: [['startDate', 'ASC']],
      limit: 5,
    }),
    Business.findByPk(businessId),
  ]);

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
      shiftName: null,
      shiftStartTime: null,
      shiftEndTime: null,
    },
    business: business ? { id: business.id, name: business.businessName } : null,
    overview,
    leaveStats: {
      pendingCount: leaveStats.pendingCount,
      approvedThisMonth: leaveStats.approvedThisMonth,
      balances: leaveStats.balances,
    },
    recentRequests: recentRequests.map((r) => ({
      id: r.id,
      leaveType: r.leaveType?.name,
      leaveTypeColor: r.leaveType?.color || '#6366f1',
      startDate: r.startDate,
      endDate: r.endDate,
      totalDays: r.totalDays,
      status: r.status,
      createdAt: r.createdAt,
    })),
    upcomingLeaves: upcomingLeaves.map((r) => ({
      id: r.id,
      leaveType: r.leaveType?.name,
      leaveTypeColor: r.leaveType?.color || '#6366f1',
      startDate: r.startDate,
      endDate: r.endDate,
      totalDays: r.totalDays,
    })),
  };

  try {
    const today = new Date().toISOString().split('T')[0];
    const assignment = await getEffectiveAssignment({ businessId, employeeId: employee.id, date: today });
    if (assignment?.shift) {
      dashboardData.employee.shiftName = assignment.shift.name;
      dashboardData.employee.shiftStartTime = assignment.shift.startTime;
      dashboardData.employee.shiftEndTime = assignment.shift.endTime;
    }
  } catch {
    // ignore
  }

  res.render('employee/dashboard', {
    title: 'Employee Dashboard',
    layout: 'employee-main',
    active: 'dashboard',
    ...dashboardData,
  });
});

/**
 * GET /employee/api/dashboard/stats - Get dashboard stats (API)
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const employee = req.employee;
  const businessId = employee.businessId;
  const leaveStats = await getLeaveStats(employee.id, businessId);
  const overview = await getEmployeeDashboardOverview(employee);

  return res.json({
    success: true,
    data: {
      employee: {
        id: employee.id,
        empId: employee.empId,
        empName: employee.empName,
        firstName: employee.firstName,
        empDepartment: employee.empDepartment,
        empDesignation: employee.empDesignation,
      },
      leaveStats,
      overview,
    },
  });
});

/**
 * GET /employee/api/dashboard/overview - Rich dashboard KPIs
 */
export const getDashboardOverview = asyncHandler(async (req, res) => {
  const overview = await getEmployeeDashboardOverview(req.employee);
  return res.json({ success: true, data: overview });
});

/**
 * GET /api/employee/profile - Get employee profile
 */
export const getEmployeeProfile = asyncHandler(async (req, res) => {
  const employee = await Employee.findByPk(req.employee.id, {
    attributes: { exclude: ['password', 'employeeRefreshToken', 'employeeRefreshTokenExpiresAt'] },
    include: [{ model: Business, as: 'business', attributes: ['id', 'businessName'] }],
  });

  return res.json({ success: true, data: employee });
});

export { parseSkills, buildCareerJourney, getCertificates };

export default {
  renderEmployeeDashboard,
  getDashboardStats,
  getDashboardOverview,
  getEmployeeProfile,
};
