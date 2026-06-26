import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  getTeamMembers,
  getTeamLeaveRequests,
  getTeamRegularizations,
  getTeamAttendanceStats,
  approveTeamLeaveRequest,
  rejectTeamLeaveRequest,
  approveTeamRegularization,
  rejectTeamRegularization,
} from '../../services/employeeTeam.service.js';

function employeeViewLocals(req, active) {
  return {
    layout: 'employee-main',
    active,
    employee: {
      id: req.employee.id,
      empName: req.employee.empName,
      empId: req.employee.empId,
      empDesignation: req.employee.empDesignation,
      firstName: req.employee.firstName,
      lastName: req.employee.lastName,
    },
    portalRole: req.portalRole,
    portalAccess: req.portalAccess,
    portalNav: req.portalNav,
  };
}

export const renderTeamDashboard = asyncHandler(async (req, res) => {
  const stats = await getTeamAttendanceStats(req.employee.id, req.employee.businessId);
  const team = await getTeamMembers(req.employee.id, req.employee.businessId);

  res.render('employee/team/dashboard', {
    title: 'Team Dashboard',
    ...employeeViewLocals(req, 'team_dashboard'),
    stats,
    team: team.map((m) => m.get({ plain: true })),
  });
});

export const renderTeamLeaves = asyncHandler(async (req, res) => {
  const requests = await getTeamLeaveRequests(req.employee.id, req.employee.businessId);

  res.render('employee/team/leaves', {
    title: 'Team Leave Requests',
    ...employeeViewLocals(req, 'team_leave'),
    requests: requests.map((r) => ({
      id: r.id,
      employeeName: r.employee?.empName,
      employeeId: r.employee?.empId,
      department: r.employee?.empDepartment,
      leaveType: r.leaveType?.name,
      leaveTypeColor: r.leaveType?.color || '#6366f1',
      startDate: r.startDate,
      endDate: r.endDate,
      totalDays: r.totalDays,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
    })),
  });
});

export const renderTeamAttendance = asyncHandler(async (req, res) => {
  const team = await getTeamMembers(req.employee.id, req.employee.businessId);
  const stats = await getTeamAttendanceStats(req.employee.id, req.employee.businessId);

  res.render('employee/team/attendance', {
    title: 'Team Attendance',
    ...employeeViewLocals(req, 'team_attendance'),
    team: team.map((m) => m.get({ plain: true })),
    stats,
  });
});

export const renderTeamCorrections = asyncHandler(async (req, res) => {
  const rows = await getTeamRegularizations(req.employee.id, req.employee.businessId);

  res.render('employee/team/corrections', {
    title: 'Attendance Corrections',
    ...employeeViewLocals(req, 'team_corrections'),
    requests: rows.map((r) => ({
      id: r.id,
      employeeName: r.employee?.empName,
      employeeId: r.employee?.empId,
      date: r.date,
      type: r.type,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
    })),
  });
});

export const renderTeamReports = asyncHandler(async (req, res) => {
  const stats = await getTeamAttendanceStats(req.employee.id, req.employee.businessId);
  const team = await getTeamMembers(req.employee.id, req.employee.businessId);

  res.render('employee/team/reports', {
    title: 'Team Reports',
    ...employeeViewLocals(req, 'team_reports'),
    stats,
    teamSize: team.length,
  });
});

export const approveTeamLeave = asyncHandler(async (req, res) => {
  const result = await approveTeamLeaveRequest(
    Number(req.params.id),
    req.employee,
    req.body?.comments || req.body?.note || null
  );

  if (!result.success) {
    return res.status(result.statusCode || 400).json({ success: false, error: result.error });
  }

  return res.json({ success: true, message: 'Leave request approved' });
});

export const rejectTeamLeave = asyncHandler(async (req, res) => {
  const result = await rejectTeamLeaveRequest(
    Number(req.params.id),
    req.employee,
    req.body?.comments || req.body?.note || null
  );

  if (!result.success) {
    return res.status(result.statusCode || 400).json({ success: false, error: result.error });
  }

  return res.json({ success: true, message: 'Leave request rejected' });
});

export const approveTeamCorrection = asyncHandler(async (req, res) => {
  try {
    await approveTeamRegularization(
      Number(req.params.id),
      req.employee,
      req.body?.note || null
    );
    return res.json({ success: true, message: 'Attendance correction approved' });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to approve correction',
    });
  }
});

export const rejectTeamCorrection = asyncHandler(async (req, res) => {
  try {
    await rejectTeamRegularization(
      Number(req.params.id),
      req.employee,
      req.body?.note || null
    );
    return res.json({ success: true, message: 'Attendance correction rejected' });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to reject correction',
    });
  }
});

export const getTeamDashboardApi = asyncHandler(async (req, res) => {
  const stats = await getTeamAttendanceStats(req.employee.id, req.employee.businessId);
  return res.json({ success: true, data: stats });
});
