// src/controllers/employee/employeeLeave.controller.js
import { Op } from 'sequelize';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { LeaveRequest, LeaveType, LeaveApproval, User } from '../../models/index.js';
import {
  applyLeave,
  cancelLeaveRequest,
  getAllLeaveBalances,
  validateLeaveRequest,
} from '../../services/leave.service.js';

/**
 * GET /employee/leaves - Render leave list page
 */
export const renderLeaveList = asyncHandler(async (req, res) => {
  const employee = req.employee;
  const businessId = employee.businessId;
  const year = parseInt(req.query.year) || new Date().getFullYear();

  // Get leave balances
  const balances = await getAllLeaveBalances(employee.id, businessId, year);

  // Get leave requests with pagination
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const status = req.query.status || null;

  const where = { employeeId: employee.id };
  if (status) {
    where.status = status;
  }

  const { count, rows: requests } = await LeaveRequest.findAndCountAll({
    where,
    include: [
      { model: LeaveType, as: 'leaveType', attributes: ['name', 'code', 'color'] },
      { model: User, as: 'approver', attributes: ['firstName', 'lastName'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const totalPages = Math.ceil(count / pageSize);

  res.render('employee/leave-list', {
    title: 'My Leaves',
    layout: 'employee-main',
    active: 'leaves',
    employee: {
      id: employee.id,
      empName: employee.empName,
      empId: employee.empId,
    },
    balances,
    requests: requests.map(r => ({
      id: r.id,
      leaveType: r.leaveType?.name,
      leaveTypeColor: r.leaveType?.color || '#6366f1',
      startDate: r.startDate,
      endDate: r.endDate,
      totalDays: parseFloat(r.totalDays),
      reason: r.reason,
      status: r.status,
      approverName: r.approver ? `${r.approver.firstName} ${r.approver.lastName}` : null,
      managerNote: r.managerNote,
      createdAt: r.createdAt,
      approvedAt: r.approvedAt,
      rejectedAt: r.rejectedAt,
      canceledAt: r.canceledAt,
    })),
    pagination: {
      page,
      pageSize,
      total: count,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    year,
    currentStatus: status,
  });
});

/**
 * GET /employee/leaves/apply - Render apply leave page
 */
export const renderApplyLeave = asyncHandler(async (req, res) => {
  const employee = req.employee;
  const businessId = employee.businessId;
  const year = new Date().getFullYear();

  // Get leave types for the business
  const leaveTypes = await LeaveType.findAll({
    where: { businessId, status: 'ACTIVE' },
    order: [['sortOrder', 'ASC'], ['name', 'ASC']],
  });

  // Get balances
  const balances = await getAllLeaveBalances(employee.id, businessId, year);

  res.render('employee/apply-leave', {
    title: 'Apply Leave',
    layout: 'employee-main',
    active: 'leaves',
    employee: {
      id: employee.id,
      empName: employee.empName,
      empId: employee.empId,
    },
    leaveTypes: leaveTypes.map(lt => ({
      id: lt.id,
      name: lt.name,
      code: lt.code,
      color: lt.color,
      isPaid: lt.isPaid,
      allowHalfDay: lt.allowHalfDay,
      requiresAttachment: lt.requiresAttachment,
      minDaysNotice: lt.minDaysNotice,
      maxPerYear: lt.maxPerYear,
    })),
    balances,
  });
});

/**
 * POST /employee/leaves/apply - Submit leave application
 */
export const submitLeaveApplication = asyncHandler(async (req, res) => {
  const employee = req.employee;
  const businessId = employee.businessId;

  const {
    leaveTypeId,
    startDate,
    endDate,
    isHalfDayStart,
    isHalfDayEnd,
    halfDaySession,
    reason,
    attachmentUrl,
    attachmentName,
  } = req.body;

  // Validate required fields
  if (!leaveTypeId || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'Leave type, start date, and end date are required',
    });
  }

  // Apply leave using service
  const result = await applyLeave({
    businessId,
    employeeId: employee.id,
    leaveTypeId: parseInt(leaveTypeId),
    startDate,
    endDate,
    isHalfDayStart: isHalfDayStart === 'true' || isHalfDayStart === true,
    isHalfDayEnd: isHalfDayEnd === 'true' || isHalfDayEnd === true,
    halfDaySession,
    reason,
    attachmentUrl,
    attachmentName,
  });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: 'Failed to apply leave',
      errors: result.errors,
    });
  }

  return res.status(201).json({
    success: true,
    message: 'Leave application submitted successfully',
    data: result.leaveRequest,
  });
});

/**
 * POST /employee/leaves/:id/cancel - Cancel leave request
 */
export const cancelLeave = asyncHandler(async (req, res) => {
  const employee = req.employee;
  const requestId = parseInt(req.params.id);

  const result = await cancelLeaveRequest(requestId, employee.id);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.error,
    });
  }

  return res.json({
    success: true,
    message: 'Leave request canceled successfully',
  });
});

/**
 * GET /employee/leaves/:id - Get leave request details
 */
export const getLeaveDetails = asyncHandler(async (req, res) => {
  const employee = req.employee;
  const requestId = parseInt(req.params.id);

  const leaveRequest = await LeaveRequest.findOne({
    where: { id: requestId, employeeId: employee.id },
    include: [
      { model: LeaveType, as: 'leaveType', attributes: ['name', 'code', 'color', 'isPaid'] },
      { model: User, as: 'approver', attributes: ['firstName', 'lastName'] },
      {
        model: LeaveApproval,
        as: 'approvals',
        include: [{ model: User, as: 'approver', attributes: ['firstName', 'lastName'] }],
        order: [['actionAt', 'DESC']],
      },
    ],
  });

  if (!leaveRequest) {
    return res.status(404).json({
      success: false,
      message: 'Leave request not found',
    });
  }

  return res.json({
    success: true,
    data: leaveRequest,
  });
});

/**
 * GET /api/employee/leaves/balances - Get leave balances
 */
export const getLeaveBalances = asyncHandler(async (req, res) => {
  const employee = req.employee;
  const businessId = employee.businessId;
  const year = parseInt(req.query.year) || new Date().getFullYear();

  const balances = await getAllLeaveBalances(employee.id, businessId, year);

  return res.json({
    success: true,
    data: balances,
  });
});

/**
 * GET /api/employee/leaves/list - Get leave requests (API)
 */
export const getLeaveRequests = asyncHandler(async (req, res) => {
  const employee = req.employee;
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const status = req.query.status || null;
  const year = parseInt(req.query.year) || null;

  const where = { employeeId: employee.id };
  if (status) {
    where.status = status;
  }
  if (year) {
    where.startDate = {
      [Op.gte]: `${year}-01-01`,
      [Op.lte]: `${year}-12-31`,
    };
  }

  const { count, rows } = await LeaveRequest.findAndCountAll({
    where,
    include: [
      { model: LeaveType, as: 'leaveType', attributes: ['name', 'code', 'color'] },
      { model: User, as: 'approver', attributes: ['firstName', 'lastName'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return res.json({
    success: true,
    data: {
      items: rows,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    },
  });
});

/**
 * POST /api/employee/leaves/validate - Validate leave request before submission
 */
export const validateLeave = asyncHandler(async (req, res) => {
  const employee = req.employee;
  const businessId = employee.businessId;

  const validation = await validateLeaveRequest({
    businessId,
    employeeId: employee.id,
    ...req.body,
  });

  return res.json({
    success: true,
    data: {
      valid: validation.valid,
      errors: validation.errors,
      totalDays: validation.totalDays,
    },
  });
});

export default {
  renderLeaveList,
  renderApplyLeave,
  submitLeaveApplication,
  cancelLeave,
  getLeaveDetails,
  getLeaveBalances,
  getLeaveRequests,
  validateLeave,
};
