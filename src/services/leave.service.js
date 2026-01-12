// src/services/leave.service.js
import { Op } from 'sequelize';
import { sequelize } from '../db/index.js';
import { LeaveRequest, LeaveType, LeaveBalance, LeaveApproval, Employee } from '../models/index.js';

/**
 * Calculate leave days between two dates (inclusive)
 * Supports half-day calculations
 */
export function calculateLeaveDays(startDate, endDate, isHalfDayStart = false, isHalfDayEnd = false) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Basic day count (inclusive)
  let days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  
  // Adjust for half days
  if (isHalfDayStart) days -= 0.5;
  if (isHalfDayEnd) days -= 0.5;
  
  return Math.max(0, days);
}

/**
 * Check for overlapping leave requests
 */
export async function checkLeaveOverlap(employeeId, startDate, endDate, excludeRequestId = null) {
  const where = {
    employeeId,
    status: { [Op.in]: ['PENDING', 'APPROVED'] },
    [Op.or]: [
      // New leave starts during existing leave
      {
        startDate: { [Op.lte]: startDate },
        endDate: { [Op.gte]: startDate },
      },
      // New leave ends during existing leave
      {
        startDate: { [Op.lte]: endDate },
        endDate: { [Op.gte]: endDate },
      },
      // New leave encompasses existing leave
      {
        startDate: { [Op.gte]: startDate },
        endDate: { [Op.lte]: endDate },
      },
    ],
  };

  if (excludeRequestId) {
    where.id = { [Op.ne]: excludeRequestId };
  }

  const overlapping = await LeaveRequest.findOne({ where });
  return overlapping;
}

/**
 * Get employee leave balance for a specific leave type and year
 */
export async function getLeaveBalance(employeeId, leaveTypeId, year = new Date().getFullYear()) {
  let balance = await LeaveBalance.findOne({
    where: { employeeId, leaveTypeId, year },
    include: [{ model: LeaveType, as: 'leaveType' }],
  });

  if (!balance) {
    // Get leave type to determine default allocation
    const leaveType = await LeaveType.findByPk(leaveTypeId);
    if (!leaveType) return null;

    // Get employee's businessId
    const employee = await Employee.findByPk(employeeId);
    if (!employee) return null;

    // Create default balance
    balance = await LeaveBalance.create({
      businessId: employee.businessId,
      employeeId,
      leaveTypeId,
      year,
      allocated: leaveType.maxPerYear || 0,
      used: 0,
      pending: 0,
      carriedForward: 0,
    });

    // Reload with association
    balance = await LeaveBalance.findByPk(balance.id, {
      include: [{ model: LeaveType, as: 'leaveType' }],
    });
  }

  return balance;
}

/**
 * Get all leave balances for an employee for current year
 */
export async function getAllLeaveBalances(employeeId, businessId, year = new Date().getFullYear()) {
  // Get all active leave types for the business
  const leaveTypes = await LeaveType.findAll({
    where: { businessId, status: 'ACTIVE' },
    order: [['sortOrder', 'ASC'], ['name', 'ASC']],
  });

  const balances = [];

  for (const leaveType of leaveTypes) {
    const balance = await getLeaveBalance(employeeId, leaveType.id, year);
    if (balance) {
      const available = balance.getAvailable();
      balances.push({
        leaveTypeId: leaveType.id,
        leaveTypeName: leaveType.name,
        leaveTypeCode: leaveType.code,
        color: leaveType.color,
        isPaid: leaveType.isPaid,
        allowHalfDay: leaveType.allowHalfDay,
        allocated: parseFloat(balance.allocated) || 0,
        used: parseFloat(balance.used) || 0,
        pending: parseFloat(balance.pending) || 0,
        carriedForward: parseFloat(balance.carriedForward) || 0,
        available,
      });
    }
  }

  return balances;
}

/**
 * Validate leave request before creation
 */
export async function validateLeaveRequest(data) {
  const errors = [];

  // Check leave type exists and is active
  const leaveType = await LeaveType.findOne({
    where: { id: data.leaveTypeId, businessId: data.businessId, status: 'ACTIVE' },
  });

  if (!leaveType) {
    errors.push('Invalid or inactive leave type');
    return { valid: false, errors, leaveType: null };
  }

  // Check dates
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate > endDate) {
    errors.push('Start date cannot be after end date');
  }

  // Check minimum notice period
  if (leaveType.minDaysNotice) {
    const noticeDays = Math.floor((startDate - today) / (1000 * 60 * 60 * 24));
    if (noticeDays < leaveType.minDaysNotice) {
      errors.push(`This leave type requires ${leaveType.minDaysNotice} days advance notice`);
    }
  }

  // Check half-day allowance
  if ((data.isHalfDayStart || data.isHalfDayEnd) && !leaveType.allowHalfDay) {
    errors.push('Half-day leave is not allowed for this leave type');
  }

  // Check attachment requirement
  if (leaveType.requiresAttachment && !data.attachmentUrl) {
    errors.push('Attachment is required for this leave type');
  }

  // Check for overlap
  const overlap = await checkLeaveOverlap(data.employeeId, data.startDate, data.endDate);
  if (overlap) {
    errors.push('Leave dates overlap with an existing request');
  }

  // Check balance
  const totalDays = calculateLeaveDays(
    data.startDate,
    data.endDate,
    data.isHalfDayStart,
    data.isHalfDayEnd
  );

  const year = startDate.getFullYear();
  const balance = await getLeaveBalance(data.employeeId, data.leaveTypeId, year);
  
  if (balance) {
    const available = balance.getAvailable();
    if (totalDays > available) {
      errors.push(`Insufficient leave balance. Available: ${available}, Requested: ${totalDays}`);
    }
  }

  return { valid: errors.length === 0, errors, leaveType, totalDays };
}

/**
 * Apply leave request - creates request and updates pending balance
 */
export async function applyLeave(data) {
  const t = await sequelize.transaction();

  try {
    // Validate
    const validation = await validateLeaveRequest(data);
    if (!validation.valid) {
      await t.rollback();
      return { success: false, errors: validation.errors };
    }

    const totalDays = validation.totalDays;

    // Create leave request
    const leaveRequest = await LeaveRequest.create(
      {
        businessId: data.businessId,
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays,
        isHalfDayStart: data.isHalfDayStart || false,
        isHalfDayEnd: data.isHalfDayEnd || false,
        halfDaySession: data.halfDaySession || null,
        reason: data.reason,
        attachmentUrl: data.attachmentUrl,
        attachmentName: data.attachmentName,
        status: 'PENDING',
      },
      { transaction: t }
    );

    // Update pending balance
    const year = new Date(data.startDate).getFullYear();
    const balance = await getLeaveBalance(data.employeeId, data.leaveTypeId, year);
    
    if (balance) {
      await balance.update(
        { pending: parseFloat(balance.pending) + totalDays },
        { transaction: t }
      );
    }

    await t.commit();

    return { success: true, leaveRequest };
  } catch (error) {
    await t.rollback();
    console.error('Apply leave error:', error);
    return { success: false, errors: [error.message] };
  }
}

/**
 * Approve leave request - updates status and balances
 */
export async function approveLeaveRequest(requestId, approverId, comments = null) {
  const t = await sequelize.transaction();

  try {
    const leaveRequest = await LeaveRequest.findByPk(requestId);
    if (!leaveRequest) {
      await t.rollback();
      return { success: false, error: 'Leave request not found' };
    }

    if (leaveRequest.status !== 'PENDING') {
      await t.rollback();
      return { success: false, error: 'Only pending requests can be approved' };
    }

    // Update request status
    await leaveRequest.update(
      {
        status: 'APPROVED',
        approverId,
        approvedAt: new Date(),
        managerNote: comments,
      },
      { transaction: t }
    );

    // Create approval record
    await LeaveApproval.create(
      {
        businessId: leaveRequest.businessId,
        leaveRequestId: requestId,
        approverId,
        action: 'APPROVED',
        comments,
        actionAt: new Date(),
      },
      { transaction: t }
    );

    // Update balances: move from pending to used
    const year = new Date(leaveRequest.startDate).getFullYear();
    const balance = await LeaveBalance.findOne({
      where: {
        employeeId: leaveRequest.employeeId,
        leaveTypeId: leaveRequest.leaveTypeId,
        year,
      },
    });

    if (balance) {
      const totalDays = parseFloat(leaveRequest.totalDays);
      await balance.update(
        {
          pending: Math.max(0, parseFloat(balance.pending) - totalDays),
          used: parseFloat(balance.used) + totalDays,
        },
        { transaction: t }
      );
    }

    await t.commit();
    return { success: true, leaveRequest };
  } catch (error) {
    await t.rollback();
    console.error('Approve leave error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject leave request
 */
export async function rejectLeaveRequest(requestId, approverId, comments = null) {
  const t = await sequelize.transaction();

  try {
    const leaveRequest = await LeaveRequest.findByPk(requestId);
    if (!leaveRequest) {
      await t.rollback();
      return { success: false, error: 'Leave request not found' };
    }

    if (leaveRequest.status !== 'PENDING') {
      await t.rollback();
      return { success: false, error: 'Only pending requests can be rejected' };
    }

    // Update request status
    await leaveRequest.update(
      {
        status: 'REJECTED',
        approverId,
        rejectedAt: new Date(),
        managerNote: comments,
      },
      { transaction: t }
    );

    // Create approval record
    await LeaveApproval.create(
      {
        businessId: leaveRequest.businessId,
        leaveRequestId: requestId,
        approverId,
        action: 'REJECTED',
        comments,
        actionAt: new Date(),
      },
      { transaction: t }
    );

    // Update balance: remove from pending
    const year = new Date(leaveRequest.startDate).getFullYear();
    const balance = await LeaveBalance.findOne({
      where: {
        employeeId: leaveRequest.employeeId,
        leaveTypeId: leaveRequest.leaveTypeId,
        year,
      },
    });

    if (balance) {
      const totalDays = parseFloat(leaveRequest.totalDays);
      await balance.update(
        { pending: Math.max(0, parseFloat(balance.pending) - totalDays) },
        { transaction: t }
      );
    }

    await t.commit();
    return { success: true, leaveRequest };
  } catch (error) {
    await t.rollback();
    console.error('Reject leave error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel leave request (by employee)
 */
export async function cancelLeaveRequest(requestId, employeeId) {
  const t = await sequelize.transaction();

  try {
    const leaveRequest = await LeaveRequest.findByPk(requestId);
    if (!leaveRequest) {
      await t.rollback();
      return { success: false, error: 'Leave request not found' };
    }

    // Verify ownership
    if (leaveRequest.employeeId !== employeeId) {
      await t.rollback();
      return { success: false, error: 'You can only cancel your own requests' };
    }

    if (leaveRequest.status !== 'PENDING') {
      await t.rollback();
      return { success: false, error: 'Only pending requests can be canceled' };
    }

    // Update request status
    await leaveRequest.update(
      { status: 'CANCELED', canceledAt: new Date() },
      { transaction: t }
    );

    // Update balance: remove from pending
    const year = new Date(leaveRequest.startDate).getFullYear();
    const balance = await LeaveBalance.findOne({
      where: {
        employeeId: leaveRequest.employeeId,
        leaveTypeId: leaveRequest.leaveTypeId,
        year,
      },
    });

    if (balance) {
      const totalDays = parseFloat(leaveRequest.totalDays);
      await balance.update(
        { pending: Math.max(0, parseFloat(balance.pending) - totalDays) },
        { transaction: t }
      );
    }

    await t.commit();
    return { success: true, leaveRequest };
  } catch (error) {
    await t.rollback();
    console.error('Cancel leave error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get leave statistics for dashboard
 */
export async function getLeaveStats(employeeId, businessId) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);

  // Get pending requests count
  const pendingCount = await LeaveRequest.count({
    where: { employeeId, status: 'PENDING' },
  });

  // Get approved leaves this month
  const approvedThisMonth = await LeaveRequest.count({
    where: {
      employeeId,
      status: 'APPROVED',
      startDate: { [Op.gte]: monthStart.toISOString().split('T')[0] },
      endDate: { [Op.lte]: monthEnd.toISOString().split('T')[0] },
    },
  });

  // Get leave balances
  const balances = await getAllLeaveBalances(employeeId, businessId, currentYear);

  return {
    pendingCount,
    approvedThisMonth,
    balances,
  };
}

export default {
  calculateLeaveDays,
  checkLeaveOverlap,
  getLeaveBalance,
  getAllLeaveBalances,
  validateLeaveRequest,
  applyLeave,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
  getLeaveStats,
};
