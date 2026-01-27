
// src/controllers/admin/adminAttendance.controller.js
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { Op } from 'sequelize';

import { Business, AttendanceDailySummary, Employee } from '../../models/index.js';
import {
  getDashboard,
  listPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  listShifts,
  createShift,
  updateShift,
  deleteShift,
  listHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  listAssignments,
  createAssignments,
  updateAssignment,
  deleteAssignment,
  getAttendanceLogs,
  manualEdit,
  listRegularizations,
  approveRegularization,
  rejectRegularization,
  lockPeriod,
  listLocks,
  unlockPeriod,
} from '../../services/attendance.service.js';

const resolveBusinessId = async (req) => {
  const raw = req.query.businessId ?? req.body?.businessId;
  const businessId = raw ? Number(raw) : null;
  if (businessId) return businessId;
console.log(businessId);
  const ownerId = req.user?.id;
  if (!ownerId) throw new ApiError(401, 'Unauthorized');

  const biz = await Business.findOne({ where: { ownerId }, order: [['createdAt', 'ASC']] });
  if (!biz) throw new ApiError(400, 'businessId is required (no business found for this user)');
  console.log(biz);
  return biz.id;
};

// --------------------
// Dashboard & logs (APIs only)
// --------------------

export const getAttendanceDashboard = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const date = (req.query.date || new Date().toISOString()).slice(0, 10);
  const data = await getDashboard({ businessId, date });
  return res.json(new ApiResponse(200, data, 'Attendance dashboard'));
});

export const getLogs = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const date = req.query.date;
  if (!date) throw new ApiError(400, 'date is required (YYYY-MM-DD)');

  const logs = await getAttendanceLogs({
    businessId,
    date,
    department: req.query.department || null,
    status: req.query.status || null,
  });

  return res.json(new ApiResponse(200, logs, 'Attendance logs'));
});

export const getReports = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  // Fetch all attendance records for the month or date range
  const startDateObj = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endDateObj = req.query.endDate ? new Date(req.query.endDate) : new Date();

  const startStr = startDateObj.toISOString().slice(0, 10);
  const endStr = endDateObj.toISOString().slice(0, 10);

  const summaries = await AttendanceDailySummary.findAll({
    where: {
      businessId,
      date: {
        [Op.gte]: startStr,
        [Op.lte]: endStr,
      },
    },
    include: [
      {
        association: 'employee',
        attributes: ['id', 'empName', 'empId', 'empDepartment', 'empDesignation'],
        required: false,
      },
    ],
    order: [['date', 'DESC']],
  });

  const logs = summaries.map((s) => ({
    id: s.id,
    date: s.date,
    status: s.status,
    checkinTime: s.firstInAt,
    checkoutTime: s.lastOutAt,
    employee: s.employee,
    employeeId: s.employeeId,
  }));

  return res.json(new ApiResponse(200, logs, 'Attendance reports'));
});

export const manualEditLog = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const { employeeId, date, punches = [], note = null } = req.body;
  if (!employeeId || !date) throw new ApiError(400, 'employeeId and date are required');

  const result = await manualEdit({
    businessId,
    employeeId: Number(employeeId),
    date,
    punches,
    note,
    actionByUserId: req.user?.id || null,
  });

  return res.json(new ApiResponse(200, result, 'Attendance updated'));
});

// --------------------
// Policies
// --------------------

export const getPolicies = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  if(!businessId){
    throw new ApiError(400, 'bussiness not found');
  }

  console.log(businessId)
  const policies = await listPolicies({ businessId });
  if(!policies){
    throw new ApiError(400, 'policy not found');
  }
  console.log(policies);
    return res.json(new ApiResponse(200, policies, 'Policies'));
});

export const postPolicy = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const { name, rulesJson = {}, status = 'ACTIVE', description = '', effectiveFrom = null } = req.body;
  if (!name) throw new ApiError(400, 'name is required');
  // Store UI-only fields inside rulesJson meta (model has no columns for them)
  const mergedRules = {
    ...(rulesJson || {}),
    _meta: {
      ...((rulesJson || {}). _meta || {}),
      description,
      effectiveFrom,
    },
  };
  const policy = await createPolicy({ businessId, name, rulesJson: mergedRules, status });
  return res.status(201).json(new ApiResponse(201, policy, 'Policy created'));
});

export const patchPolicy = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  console.log(businessId);
  const { id } = req.params;
  console.log(id);
  console.log(req.body);
  const patch = { ...(req.body || {}) };
  if (patch.description !== undefined || patch.effectiveFrom !== undefined) {
    const rulesJson = patch.rulesJson || {};
    patch.rulesJson = {
      ...rulesJson,
      _meta: {
        ...(rulesJson._meta || {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.effectiveFrom !== undefined ? { effectiveFrom: patch.effectiveFrom } : {}),
      },
    };
    delete patch.description;
    delete patch.effectiveFrom;
  }
  const policy = await updatePolicy({ id: Number(id), businessId, patch });
  console.log(policy);
  return res.json(new ApiResponse(200, policy, 'Policy updated'));
});

export const removePolicy = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const { id } = req.params;
  await deletePolicy({ id: Number(id), businessId });
  return res.json(new ApiResponse(200, true, 'Policy deleted'));
});

// --------------------
// Shifts
// --------------------

export const getShifts = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const shifts = await listShifts({ businessId });
  return res.json(new ApiResponse(200, shifts, 'Shifts'));
});

export const postShift = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const { name, startTime, endTime, breakRuleJson = {}, status = 'ACTIVE' } = req.body;
  if (!name || !startTime || !endTime) throw new ApiError(400, 'name, startTime, endTime are required');
  const shift = await createShift({ businessId, name, startTime, endTime, breakRuleJson, status });
  return res.status(201).json(new ApiResponse(201, shift, 'Shift created'));
});

export const patchShift = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const { id } = req.params;
  const shift = await updateShift({ id: Number(id), businessId, patch: req.body });
  return res.json(new ApiResponse(200, shift, 'Shift updated'));
});

export const removeShift = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const { id } = req.params;
  await deleteShift({ id: Number(id), businessId });
  return res.json(new ApiResponse(200, true, 'Shift deleted'));
});

// --------------------
// Holidays
// --------------------

export const getHolidays = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const year = req.query.year ? Number(req.query.year) : null;
  const holidays = await listHolidays({ businessId, year });
  return res.json(new ApiResponse(200, holidays, 'Holidays'));
});

export const postHoliday = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const { date, name, region = null } = req.body;
  if (!date || !name) throw new ApiError(400, 'date and name are required');
  const holiday = await createHoliday({ businessId, date, name, region });
  return res.status(201).json(new ApiResponse(201, holiday, 'Holiday created'));
});

export const patchHoliday = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const { id } = req.params;
  const holiday = await updateHoliday({ id: Number(id), businessId, patch: req.body });
  return res.json(new ApiResponse(200, holiday, 'Holiday updated'));
});

export const removeHoliday = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const { id } = req.params;
  await deleteHoliday({ id: Number(id), businessId });
  return res.json(new ApiResponse(200, true, 'Holiday deleted'));
});

// --------------------
// Assignments
// --------------------

export const getAssignments = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const employeeId = req.query.employeeId ? Number(req.query.employeeId) : null;
  const assignments = await listAssignments({ businessId, employeeId });
  return res.json(new ApiResponse(200, assignments, 'Shift assignments'));
});

export const postAssignments = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const {
    policyId,
    shiftId,
    effectiveFrom,
    effectiveTo = null,
    weekoffPatternJson = {},
    scopeType = 'EMPLOYEE',
    scopeValue = null,
    employeeIds = [],
  } = req.body;

  const rows = await createAssignments({
    businessId,
    policyId: Number(policyId),
    shiftId: Number(shiftId),
    effectiveFrom,
    effectiveTo,
    weekoffPatternJson,
    scopeType,
    scopeValue,
    employeeIds,
  });

  return res.status(201).json(new ApiResponse(201, rows, 'Assignments created'));
});

export const patchAssignment = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const { id } = req.params;
  const patch = { ...(req.body || {}) };
  if (patch.policyId !== undefined) patch.policyId = Number(patch.policyId);
  if (patch.shiftId !== undefined) patch.shiftId = Number(patch.shiftId);
  const updated = await updateAssignment({ id: Number(id), businessId, patch });
  return res.json(new ApiResponse(200, updated, 'Assignment updated'));
});

export const removeAssignment = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const { id } = req.params;
  await deleteAssignment({ id: Number(id), businessId });
  return res.json(new ApiResponse(200, true, 'Assignment deleted'));
});

// --------------------
// Regularizations
// --------------------

export const getRegularizations = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const status = req.query.status || null;
  const list = await listRegularizations({ businessId, status });
  return res.json(new ApiResponse(200, list, 'Regularization requests'));
});

export const approveRegularizationRequest = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const { id } = req.params;
  const { actionNote = null } = req.body;

  const result = await approveRegularization({
    businessId,
    id: Number(id),
    actionByUserId: req.user?.id || null,
    actionNote,
  });

  return res.json(new ApiResponse(200, result, 'Regularization approved'));
});

export const rejectRegularizationRequest = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const { id } = req.params;
  const { actionNote = null } = req.body;
  const result = await rejectRegularization({
    businessId,
    id: Number(id),
    actionByUserId: req.user?.id || null,
    actionNote,
  });
  return res.json(new ApiResponse(200, result, 'Regularization rejected'));
});

// --------------------
// Lock / Unlock
// --------------------

export const lockAttendancePeriod = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const { period } = req.body;
  if (!period) throw new ApiError(400, 'period is required (YYYY-MM)');
  const lock = await lockPeriod({ businessId, period, lockedByUserId: req.user?.id || 0 });
  return res.json(new ApiResponse(200, lock, 'Period locked'));
});

export const unlockAttendancePeriod = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const { period, unlockNote } = req.body;
  if (!period) throw new ApiError(400, 'period is required (YYYY-MM)');
  await unlockPeriod({ businessId, period, unlockNote });
  return res.json(new ApiResponse(200, true, 'Period unlocked'));
});

export const getLockedPeriods = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const locks = await listLocks({ businessId });
  return res.json(new ApiResponse(200, locks, 'Locked periods'));
});
