import { Op } from 'sequelize';
import {
  LeaveRequest,
  LeaveType,
  LeaveBalance,
  LeaveApproval,
  Employee,
  User,
  Business,
  AttendanceRegularization,
  AttendanceDailySummary,
} from '../models/index.js';
import {
  approveLeaveRequest,
  rejectLeaveRequest,
} from './leave.service.js';
import {
  approveRegularization,
  rejectRegularization,
} from './attendance.service.js';
import { getDirectReportIds } from './employeePortalPermissions.service.js';

async function resolveAuditUserId(actorEmployee) {
  const email = String(actorEmployee?.empEmail || '').trim().toLowerCase();
  if (email) {
    const user = await User.findOne({ where: { email }, attributes: ['id'] });
    if (user) return user.id;
  }
  const business = await Business.findByPk(actorEmployee.businessId, { attributes: ['ownerId'] });
  return business?.ownerId || actorEmployee.userId;
}

export async function assertManagerOverEmployee(managerEmployeeId, targetEmployeeId, businessId) {
  const target = await Employee.findOne({
    where: { id: targetEmployeeId, businessId },
    attributes: ['id', 'reportingManagerId', 'empName'],
  });
  if (!target) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }
  if (Number(target.reportingManagerId) !== Number(managerEmployeeId)) {
    const err = new Error('You can only manage employees who report directly to you');
    err.statusCode = 403;
    throw err;
  }
  return target;
}

export async function getTeamMembers(managerEmployeeId, businessId) {
  return Employee.findAll({
    where: {
      businessId,
      reportingManagerId: Number(managerEmployeeId),
      isActive: true,
    },
    attributes: ['id', 'empId', 'empName', 'empEmail', 'empDepartment', 'empDesignation'],
    order: [['empName', 'ASC']],
  });
}

export async function getTeamLeaveRequests(managerEmployeeId, businessId, { status = 'PENDING' } = {}) {
  const reportIds = await getDirectReportIds(managerEmployeeId, businessId);
  if (!reportIds.length) return [];

  const where = { employeeId: { [Op.in]: reportIds }, businessId };
  if (status) where.status = status;

  return LeaveRequest.findAll({
    where,
    include: [
      { model: LeaveType, as: 'leaveType', attributes: ['name', 'code', 'color'] },
      {
        model: Employee,
        as: 'employee',
        attributes: ['id', 'empName', 'empId', 'empDepartment', 'empDesignation'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });
}

export async function getTeamRegularizations(managerEmployeeId, businessId, { status = 'PENDING' } = {}) {
  const reportIds = await getDirectReportIds(managerEmployeeId, businessId);
  if (!reportIds.length) return [];

  const where = { employeeId: { [Op.in]: reportIds }, businessId };
  if (status) where.status = status;

  return AttendanceRegularization.findAll({
    where,
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['id', 'empName', 'empId', 'empDepartment'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });
}

export async function getTeamAttendanceStats(managerEmployeeId, businessId, month) {
  const reportIds = await getDirectReportIds(managerEmployeeId, businessId);
  if (!reportIds.length) {
    return { teamSize: 0, presentToday: 0, absentToday: 0, pendingLeave: 0, pendingCorrections: 0 };
  }

  const today = new Date().toISOString().split('T')[0];
  const [presentToday, absentToday, pendingLeave, pendingCorrections] = await Promise.all([
    AttendanceDailySummary.count({
      where: {
        businessId,
        employeeId: { [Op.in]: reportIds },
        date: today,
        status: { [Op.in]: ['PRESENT', 'LATE', 'HALF_DAY'] },
      },
    }),
    AttendanceDailySummary.count({
      where: {
        businessId,
        employeeId: { [Op.in]: reportIds },
        date: today,
        status: { [Op.in]: ['ABSENT', 'ON_LEAVE'] },
      },
    }),
    LeaveRequest.count({
      where: { businessId, employeeId: { [Op.in]: reportIds }, status: 'PENDING' },
    }),
    AttendanceRegularization.count({
      where: { businessId, employeeId: { [Op.in]: reportIds }, status: 'PENDING' },
    }),
  ]);

  return {
    teamSize: reportIds.length,
    month: month || today.slice(0, 7),
    presentToday,
    absentToday,
    pendingLeave,
    pendingCorrections,
  };
}

export async function approveTeamLeaveRequest(requestId, managerEmployee, comments = null) {
  const leaveRequest = await LeaveRequest.findByPk(requestId);
  if (!leaveRequest) {
    return { success: false, error: 'Leave request not found', statusCode: 404 };
  }

  await assertManagerOverEmployee(managerEmployee.id, leaveRequest.employeeId, managerEmployee.businessId);

  const approverUserId = await resolveAuditUserId(managerEmployee);
  return approveLeaveRequest(requestId, approverUserId, comments);
}

export async function rejectTeamLeaveRequest(requestId, managerEmployee, comments = null) {
  const leaveRequest = await LeaveRequest.findByPk(requestId);
  if (!leaveRequest) {
    return { success: false, error: 'Leave request not found', statusCode: 404 };
  }

  await assertManagerOverEmployee(managerEmployee.id, leaveRequest.employeeId, managerEmployee.businessId);

  const approverUserId = await resolveAuditUserId(managerEmployee);
  return rejectLeaveRequest(requestId, approverUserId, comments);
}

export async function approveTeamRegularization(regularizationId, managerEmployee, actionNote = null) {
  const row = await AttendanceRegularization.findByPk(regularizationId);
  if (!row) {
    const err = new Error('Correction request not found');
    err.statusCode = 404;
    throw err;
  }

  await assertManagerOverEmployee(managerEmployee.id, row.employeeId, managerEmployee.businessId);

  const actionByUserId = await resolveAuditUserId(managerEmployee);
  return approveRegularization({
    businessId: managerEmployee.businessId,
    id: regularizationId,
    actionByUserId,
    actionNote,
  });
}

export async function rejectTeamRegularization(regularizationId, managerEmployee, actionNote = null) {
  const row = await AttendanceRegularization.findByPk(regularizationId);
  if (!row) {
    const err = new Error('Correction request not found');
    err.statusCode = 404;
    throw err;
  }

  await assertManagerOverEmployee(managerEmployee.id, row.employeeId, managerEmployee.businessId);

  const actionByUserId = await resolveAuditUserId(managerEmployee);
  return rejectRegularization({
    businessId: managerEmployee.businessId,
    id: regularizationId,
    actionByUserId,
    actionNote,
  });
}
