// src/controllers/admin/adminLeave.controller.js
import { Op } from 'sequelize';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  LeaveRequest,
  LeaveType,
  LeaveBalance,
  Employee,
  User,
  Business,
} from '../../models/index.js';
import {
  approveLeaveRequest,
  rejectLeaveRequest,
  getAllLeaveBalances,
} from '../../services/leave.service.js';

/**
 * GET /leave-requests - Render leave requests management page
 */
export const renderLeaveRequests = asyncHandler(async (req, res) => {
  const user = req.user;
  
  // Get filter parameters
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const status = req.query.status || null;
  const businessId = req.query.businessId || null;

  // Build where clause
  const where = {};
  if (status) where.status = status;
  if (businessId) where.businessId = businessId;

  // Get leave requests with pagination
  const { count, rows: requests } = await LeaveRequest.findAndCountAll({
    where,
    include: [
      { model: LeaveType, as: 'leaveType', attributes: ['id', 'name', 'code', 'color'] },
      { model: Employee, as: 'employee', attributes: ['id', 'empId', 'empName', 'empDepartment', 'empDesignation'] },
      { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const totalPages = Math.ceil(count / pageSize);

  // Get businesses for filter dropdown
  const businesses = await Business.findAll({
    attributes: ['id', 'businessName'],
    order: [['businessName', 'ASC']],
  });

  // Count by status for summary
  const statusCounts = await LeaveRequest.findAll({
    attributes: [
      'status',
      [LeaveRequest.sequelize.fn('COUNT', LeaveRequest.sequelize.col('LeaveRequest.id')), 'count'],
    ],
    group: ['status'],
    raw: true,
  });

  const stats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    canceled: 0,
  };
  statusCounts.forEach(s => {
    stats[s.status.toLowerCase()] = parseInt(s.count);
  });

  res.render('admin/leave-requests', {
    title: 'Leave Requests',
    user,
    active: 'leaveRequests',
    activeGroup: 'workspace',
    requests: requests.map(r => ({
      id: r.id,
      employee: r.employee,
      leaveType: r.leaveType,
      startDate: r.startDate,
      endDate: r.endDate,
      totalDays: parseFloat(r.totalDays),
      reason: r.reason,
      status: r.status,
      approver: r.approver,
      managerNote: r.managerNote,
      createdAt: r.createdAt,
      approvedAt: r.approvedAt,
      rejectedAt: r.rejectedAt,
    })),
    pagination: {
      page,
      pageSize,
      total: count,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    businesses,
    currentStatus: status,
    currentBusinessId: businessId,
    stats,
  });
});

/**
 * GET /leave-requests/leave-types - Render leave types management page
 */
export const renderLeaveTypes = asyncHandler(async (req, res) => {
  const user = req.user;
  
  // Get filter/search/sort/pagination parameters
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const businessId = req.query.businessId || null;
  const search = req.query.search || '';
  const sortBy = req.query.sortBy || 'name';
  const sortOrder = req.query.sortOrder || 'ASC';
  const statusFilter = req.query.status || '';

  // Build where clause
  const where = {};
  if (businessId) where.businessId = businessId;
  if (statusFilter) where.status = statusFilter;
  
  // Search in name or code
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { code: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];
  }

  // Valid sort columns
  const validSortColumns = ['name', 'code', 'maxPerYear', 'status', 'createdAt'];
  const orderColumn = validSortColumns.includes(sortBy) ? sortBy : 'name';
  const orderDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  // Get leave types with pagination
  const { count, rows: leaveTypes } = await LeaveType.findAndCountAll({
    where,
    include: [{ model: Business, as: 'business', attributes: ['id', 'businessName'] }],
    order: [[orderColumn, orderDirection]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    paranoid: false,
  });

  const totalPages = Math.ceil(count / pageSize);

  const businesses = await Business.findAll({
    attributes: ['id', 'businessName'],
    order: [['businessName', 'ASC']],
  });

  res.render('admin/leave-types', {
    title: 'Leave Types',
    user,
    active: 'leaveTypes',
    activeGroup: 'workspace',
    leaveTypes: leaveTypes.map(lt => ({
      id: lt.id,
      name: lt.name,
      code: lt.code,
      description: lt.description,
      status: lt.status,
      color: lt.color,
      isPaid: lt.isPaid,
      allowHalfDay: lt.allowHalfDay,
      maxPerYear: lt.maxPerYear,
      allowCarryForward: lt.allowCarryForward,
      requiresAttachment: lt.requiresAttachment,
      minDaysNotice: lt.minDaysNotice,
      business: lt.business,
      businessId: lt.businessId,
      deletedAt: lt.deletedAt,
    })),
    pagination: {
      page,
      pageSize,
      total: count,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    businesses,
    currentBusinessId: businessId,
    currentSearch: search,
    currentSortBy: sortBy,
    currentSortOrder: sortOrder,
    currentStatus: statusFilter,
  });
});

/**
 * POST /leave-requests/leave-types/create - Create new leave type
 */
export const createLeaveType = asyncHandler(async (req, res) => {
  try {
    const { businessId, name, code, description, maxPerYear, isPaid, allowHalfDay, allowCarryForward, requiresAttachment, minDaysNotice, color, status } = req.body;

    if (!businessId || !name || !code) {
      return res.status(400).json({ success: false, message: 'Business, name, and code are required' });
    }

    // Check if code already exists for this business
    const existing = await LeaveType.findOne({ where: { businessId, code } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Leave type code already exists for this business' });
    }

    const leaveType = await LeaveType.create({
      businessId,
      name,
      code: code.toUpperCase(),
      description: description || null,
      maxPerYear: maxPerYear ? parseInt(maxPerYear) : null,
      isPaid: isPaid === 'true' || isPaid === true,
      allowHalfDay: allowHalfDay === 'true' || allowHalfDay === true,
      allowCarryForward: allowCarryForward === 'true' || allowCarryForward === true,
      requiresAttachment: requiresAttachment === 'true' || requiresAttachment === true,
      minDaysNotice: minDaysNotice ? parseInt(minDaysNotice) : 0,
      color: color || '#6366f1',
      status: status || 'ACTIVE',
    });

    return res.json({ success: true, message: 'Leave type created', data: leaveType });
  } catch (error) {
    console.error('Create leave type error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /leave-requests/leave-types/:id - Get single leave type
 */
export const getLeaveType = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const leaveType = await LeaveType.findByPk(id, {
      include: [{ model: Business, as: 'business' }],
      paranoid: false,
    });

    if (!leaveType) {
      return res.status(404).json({ success: false, message: 'Leave type not found' });
    }

    return res.json({ success: true, data: leaveType });
  } catch (error) {
    console.error('Get leave type error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /leave-requests/leave-types/:id - Update leave type
 */
export const updateLeaveType = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, maxPerYear, isPaid, allowHalfDay, allowCarryForward, requiresAttachment, minDaysNotice, color, status } = req.body;

    const leaveType = await LeaveType.findByPk(id, { paranoid: false });
    if (!leaveType) {
      return res.status(404).json({ success: false, message: 'Leave type not found' });
    }

    // Check if code already exists for another leave type in this business
    if (code && code !== leaveType.code) {
      const existing = await LeaveType.findOne({ 
        where: { businessId: leaveType.businessId, code, id: { [Op.ne]: id } } 
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Leave type code already exists for this business' });
      }
    }

    await leaveType.update({
      name: name || leaveType.name,
      code: code ? code.toUpperCase() : leaveType.code,
      description: description !== undefined ? description : leaveType.description,
      maxPerYear: maxPerYear !== undefined ? (maxPerYear ? parseInt(maxPerYear) : null) : leaveType.maxPerYear,
      isPaid: isPaid !== undefined ? (isPaid === 'true' || isPaid === true) : leaveType.isPaid,
      allowHalfDay: allowHalfDay !== undefined ? (allowHalfDay === 'true' || allowHalfDay === true) : leaveType.allowHalfDay,
      allowCarryForward: allowCarryForward !== undefined ? (allowCarryForward === 'true' || allowCarryForward === true) : leaveType.allowCarryForward,
      requiresAttachment: requiresAttachment !== undefined ? (requiresAttachment === 'true' || requiresAttachment === true) : leaveType.requiresAttachment,
      minDaysNotice: minDaysNotice !== undefined ? parseInt(minDaysNotice) : leaveType.minDaysNotice,
      color: color || leaveType.color,
      status: status || leaveType.status,
    });

    return res.json({ success: true, message: 'Leave type updated', data: leaveType });
  } catch (error) {
    console.error('Update leave type error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /leave-requests/leave-types/:id - Delete leave type (soft delete)
 */
export const deleteLeaveType = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const leaveType = await LeaveType.findByPk(id);
    if (!leaveType) {
      return res.status(404).json({ success: false, message: 'Leave type not found' });
    }

    await leaveType.destroy(); // Soft delete

    return res.json({ success: true, message: 'Leave type deleted' });
  } catch (error) {
    console.error('Delete leave type error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /leave-requests/leave-balances - Render leave balances page
 */
export const renderLeaveBalances = asyncHandler(async (req, res) => {
  const user = req.user;
  const businessId = req.query.businessId || null;
  const year = parseInt(req.query.year) || new Date().getFullYear();

  // Get employees with their balances
  const employeeWhere = { isActive: true };
  if (businessId) employeeWhere.businessId = businessId;

  const employees = await Employee.findAll({
    where: employeeWhere,
    attributes: ['id', 'empId', 'empName', 'empDepartment', 'businessId'],
    include: [
      { model: Business, as: 'business', attributes: ['id', 'businessName'] },
    ],
    order: [['empName', 'ASC']],
  });

  // Get balances for each employee
  const employeeBalances = [];
  for (const emp of employees) {
    const balances = await getAllLeaveBalances(emp.id, emp.businessId, year);
    employeeBalances.push({
      employee: {
        id: emp.id,
        empId: emp.empId,
        empName: emp.empName,
        empDepartment: emp.empDepartment,
        business: emp.business,
      },
      balances,
    });
  }

  const businesses = await Business.findAll({
    attributes: ['id', 'businessName'],
    order: [['businessName', 'ASC']],
  });

  res.render('admin/leave-balances', {
    title: 'Leave Balances',
    user,
    active: 'leaveBalances',
    activeGroup: 'workspace',
    employeeBalances,
    businesses,
    currentBusinessId: businessId,
    year,
    years: [year - 1, year, year + 1],
  });
});

/**
 * POST /leave-requests/:id/approve - Approve leave request
 */
export const approveRequest = asyncHandler(async (req, res) => {
  const requestId = parseInt(req.params.id);
  const approverId = req.user.id;
  const comments = req.body.comments || null;

  const result = await approveLeaveRequest(requestId, approverId, comments);

  if (!result.success) {
    return res.status(400).json({ success: false, message: result.error });
  }

  return res.json({ success: true, message: 'Leave request approved' });
});

/**
 * POST /leave-requests/:id/reject - Reject leave request
 */
export const rejectRequest = asyncHandler(async (req, res) => {
  const requestId = parseInt(req.params.id);
  const approverId = req.user.id;
  const comments = req.body.comments || req.body.reason || null;

  const result = await rejectLeaveRequest(requestId, approverId, comments);

  if (!result.success) {
    return res.status(400).json({ success: false, message: result.error });
  }

  return res.json({ success: true, message: 'Leave request rejected' });
});

export default {
  renderLeaveRequests,
  renderLeaveTypes,
  renderLeaveBalances,
  approveRequest,
  rejectRequest,
  createLeaveType,
  getLeaveType,
  updateLeaveType,
  deleteLeaveType,
};
