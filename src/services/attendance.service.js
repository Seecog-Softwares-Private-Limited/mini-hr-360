// src/services/attendance.service.js
import { Op } from 'sequelize';
import { sequelize } from '../db/index.js';
import {
  AttendancePolicy,
  Shift,
  Holiday,
  EmployeeShiftAssignment,
  AttendancePunch,
  AttendanceDailySummary,
  AttendanceRegularization,
  AttendanceLock,
  Employee,
  LeaveRequest,
} from '../models/index.js';


// -------------------- Helpers --------------------

const toDateOnly = (d) => {
  if (!d) throw new Error('date is required');
  if (typeof d === 'string') return d.slice(0, 10);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const toPeriod = (dateStr) => toDateOnly(dateStr).slice(0, 7); // YYYY-MM

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const [h, m, s] = timeStr.split(':').map((v) => Number(v));
  return (h || 0) * 60 + (m || 0) + Math.floor((s || 0) / 60);
};

const minutesDiff = (later, earlier) => {
  if (!later || !earlier) return 0;
  return Math.max(0, Math.round((new Date(later) - new Date(earlier)) / 60000));
};

const startEndOfMonth = (period) => {
  const [y, m] = period.split('-').map((x) => Number(x));
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1)); // exclusive

  const startStr = `${period}-01`;
  const endY = end.getUTCFullYear();
  const endM = String(end.getUTCMonth() + 1).padStart(2, '0');
  const endD = String(end.getUTCDate()).padStart(2, '0');
  const endStr = `${endY}-${endM}-${endD}`;
  return { startStr, endStr };
};

const getWeekday = (dateStr) => new Date(`${dateStr}T00:00:00`).getDay(); // 0=Sun

const previousDate = (dateStr) => {
  const d = new Date(`${toDateOnly(dateStr)}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return toDateOnly(d);
};

const isWeekoff = (dateStr, weekoffPatternJson) => {
  const weekday = getWeekday(dateStr);
  const days = weekoffPatternJson?.days;
  if (Array.isArray(days) && days.length) return days.includes(weekday);
  return weekday === 0 || weekday === 6; // default Sat+Sun
};

// -------------------- Guards --------------------

export const ensureNotLocked = async ({ businessId, date }) => {
  const period = toPeriod(date);
  const lock = await AttendanceLock.findOne({ where: { businessId, period } });
  if (lock) {
    const err = new Error(`Attendance period ${period} is locked`);
    err.statusCode = 409;
    throw err;
  }
};

// -------------------- Setup: policies --------------------

export const listPolicies = ({ businessId }) =>
  AttendancePolicy.findAll({ where: { businessId }, order: [['createdAt', 'DESC']] });

export const createPolicy = ({ businessId, name, rulesJson = {}, status = 'ACTIVE' }) => {
  if (!businessId || !name) throw new Error('businessId and name are required');
  return AttendancePolicy.create({ businessId, name, rulesJson, status });
};

export const updatePolicy = async ({ id, businessId, patch }) => {
  const policy = await AttendancePolicy.findOne({ where: { id, businessId } });
  if (!policy) {
    const err = new Error('Policy not found');
    err.statusCode = 404;
    throw err;
  }
  await policy.update(patch);
  return policy;
};

export const deletePolicy = async ({ id, businessId }) => {
  const policy = await AttendancePolicy.findOne({ where: { id, businessId } });
  if (!policy) {
    const err = new Error('Policy not found');
    err.statusCode = 404;
    throw err;
  }
  // Hard delete so MySQL Workbench reflects deletion immediately
  await policy.destroy({ force: true });
  return true;
};

// -------------------- Setup: shifts --------------------

export const listShifts = ({ businessId }) =>
  Shift.findAll({ where: { businessId }, order: [['createdAt', 'DESC']] });

export const createShift = ({ businessId, name, startTime, endTime, breakRuleJson = {}, status = 'ACTIVE' }) => {
  if (!businessId || !name || !startTime || !endTime) {
    throw new Error('businessId, name, startTime, endTime are required');
  }
  return Shift.create({ businessId, name, startTime, endTime, breakRuleJson, status });
};

export const updateShift = async ({ id, businessId, patch }) => {
  const shift = await Shift.findOne({ where: { id, businessId } });
  if (!shift) {
    const err = new Error('Shift not found');
    err.statusCode = 404;
    throw err;
  }
  await shift.update(patch);
  return shift;
};

export const deleteShift = async ({ id, businessId }) => {
  const shift = await Shift.findOne({ where: { id, businessId } });
  if (!shift) {
    const err = new Error('Shift not found');
    err.statusCode = 404;
    throw err;
  }
  // Hard delete so MySQL Workbench reflects deletion immediately
  await shift.destroy({ force: true });
  return true;
};

// -------------------- Setup: holidays --------------------

export const listHolidays = ({ businessId, year }) => {
  const where = { businessId };
  if (year) where.date = { [Op.between]: [`${year}-01-01`, `${year}-12-31`] };
  return Holiday.findAll({ where, order: [['date', 'ASC']] });
};

export const createHoliday = ({ businessId, date, name, region = null }) => {
  if (!businessId || !date || !name) throw new Error('businessId, date, name are required');
  return Holiday.create({ businessId, date: toDateOnly(date), name, region });
};

export const updateHoliday = async ({ id, businessId, patch }) => {
  const holiday = await Holiday.findOne({ where: { id, businessId } });
  if (!holiday) {
    const err = new Error('Holiday not found');
    err.statusCode = 404;
    throw err;
  }
  if (patch?.date) patch.date = toDateOnly(patch.date);
  await holiday.update(patch);
  return holiday;
};

export const deleteHoliday = async ({ id, businessId }) => {
  const h = await Holiday.findOne({ where: { id, businessId } });
  if (!h) {
    const err = new Error('Holiday not found');
    err.statusCode = 404;
    throw err;
  }
  // Hard delete so MySQL Workbench reflects deletion immediately
  await h.destroy({ force: true });
  return true;
};

// -------------------- Setup: assignments --------------------

export const resolveEmployeesForAssignment = async ({ businessId, scopeType, scopeValue, employeeIds }) => {
  if (scopeType === 'EMPLOYEE') {
    const ids = Array.isArray(employeeIds) ? employeeIds : [];
    if (!ids.length) throw new Error('employeeIds is required for EMPLOYEE scope');
    return Employee.findAll({ where: { businessId, id: { [Op.in]: ids } } });
  }
  if (scopeType === 'DEPARTMENT') {
    if (!scopeValue) throw new Error('scopeValue is required for DEPARTMENT scope');
    return Employee.findAll({ where: { businessId, empDepartment: scopeValue } });
  }
  if (scopeType === 'DESIGNATION') {
    if (!scopeValue) throw new Error('scopeValue is required for DESIGNATION scope');
    return Employee.findAll({ where: { businessId, empDesignation: scopeValue } });
  }
  if (scopeType === 'ALL') {
    // Assign to all active employees in the business
    return Employee.findAll({ where: { businessId, empStatus: 'ACTIVE' } });
  }
  throw new Error('Invalid scopeType. Must be EMPLOYEE, DEPARTMENT, DESIGNATION, or ALL');
};

export const createAssignments = async ({
  businessId,
  policyId,
  shiftId,
  effectiveFrom,
  effectiveTo = null,
  weekoffPatternJson = {},
  scopeType = 'EMPLOYEE',
  scopeValue = null,
  employeeIds = [],
}) => {
  if (!businessId || !policyId || !shiftId || !effectiveFrom) {
    throw new Error('businessId, policyId, shiftId, effectiveFrom are required');
  }

  const [policy, shift] = await Promise.all([
    AttendancePolicy.findOne({ where: { id: policyId, businessId } }),
    Shift.findOne({ where: { id: shiftId, businessId } }),
  ]);

  if (!policy) {
    const err = new Error('Policy not found');
    err.statusCode = 404;
    throw err;
  }
  if (!shift) {
    const err = new Error('Shift not found');
    err.statusCode = 404;
    throw err;
  }

  const employees = await resolveEmployeesForAssignment({ businessId, scopeType, scopeValue, employeeIds });
  if (!employees.length) throw new Error('No employees found for assignment');

  const from = toDateOnly(effectiveFrom);
  const to = effectiveTo ? toDateOnly(effectiveTo) : null;

  return sequelize.transaction(async (t) => {
    const rows = [];
    for (const emp of employees) {
      // Close overlapping active assignment
      await EmployeeShiftAssignment.update(
        { effectiveTo: previousDate(from) },
        {
          where: {
            businessId,
            employeeId: emp.id,
            status: 'ACTIVE',
            effectiveFrom: { [Op.lte]: from },
            [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: from } }],
          },
          transaction: t,
        }
      );

      const created = await EmployeeShiftAssignment.create(
        {
          businessId,
          employeeId: emp.id,
          policyId,
          shiftId,
          effectiveFrom: from,
          effectiveTo: to,
          weekoffPatternJson,
          status: 'ACTIVE',
        },
        { transaction: t }
      );

      rows.push(created);
    }
    return rows;
  });
};

export const listAssignments = async ({ businessId, employeeId = null }) => {
  const where = { businessId };
  if (employeeId) where.employeeId = employeeId;

  return EmployeeShiftAssignment.findAll({
    where,
    include: [
      { model: Employee, as: 'employee', attributes: ['id', 'empName', 'empDepartment', 'empDesignation'] },
      { model: AttendancePolicy, as: 'policy', attributes: ['id', 'name'] },
      { model: Shift, as: 'shift', attributes: ['id', 'name', 'startTime', 'endTime'] },
    ],
    order: [['effectiveFrom', 'DESC']],
  });
};

export const updateAssignment = async ({ id, businessId, patch }) => {
  const assignment = await EmployeeShiftAssignment.findOne({ where: { id, businessId } });
  if (!assignment) {
    const err = new Error('Assignment not found');
    err.statusCode = 404;
    throw err;
  }

  if (patch?.effectiveFrom) patch.effectiveFrom = toDateOnly(patch.effectiveFrom);
  if (patch?.effectiveTo) patch.effectiveTo = toDateOnly(patch.effectiveTo);

  await assignment.update(patch);
  return assignment;
};

export const deleteAssignment = async ({ id, businessId }) => {
  const assignment = await EmployeeShiftAssignment.findOne({ where: { id, businessId } });
  if (!assignment) {
    const err = new Error('Assignment not found');
    err.statusCode = 404;
    throw err;
  }
  await assignment.destroy({ force: true });
  return true;
};

// -------------------- Runtime: calculation --------------------

export const getEffectiveAssignment = async ({ businessId, employeeId, date }) => {
  const d = toDateOnly(date);
  return EmployeeShiftAssignment.findOne({
    where: {
      businessId,
      employeeId,
      status: 'ACTIVE',
      effectiveFrom: { [Op.lte]: d },
      [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: d } }],
    },
    include: [{ model: AttendancePolicy, as: 'policy' }, { model: Shift, as: 'shift' }],
    order: [['effectiveFrom', 'DESC']],
  });
};

export const isHoliday = async ({ businessId, date }) => {
  const d = toDateOnly(date);
  return !!(await Holiday.findOne({ where: { businessId, date: d } }));
};

export const isOnApprovedLeave = async ({ businessId, employeeId, date }) => {
  const d = toDateOnly(date);
  return !!(await LeaveRequest.findOne({
    where: {
      businessId,
      employeeId,
      status: 'APPROVED',
      startDate: { [Op.lte]: d },
      endDate: { [Op.gte]: d },
    },
  }));
};

export const calculateBreakMinutes = (punches) => {
  let breakStart = null;
  let total = 0;
  for (const p of punches) {
    if (p.punchType === 'BREAK_START') breakStart = p.punchAt;
    if (p.punchType === 'BREAK_END' && breakStart) {
      total += minutesDiff(p.punchAt, breakStart);
      breakStart = null;
    }
  }
  return total;
};

export const recalculateDay = async ({ businessId, employeeId, date, source = 'AUTO', notes = null, transaction = null }) => {
  const d = toDateOnly(date);

  const [assignment, holiday, onLeave] = await Promise.all([
    getEffectiveAssignment({ businessId, employeeId, date: d }),
    isHoliday({ businessId, date: d }),
    isOnApprovedLeave({ businessId, employeeId, date: d }),
  ]);

  const policy = assignment?.policy?.rulesJson || {};
  const shift = assignment?.shift || null;
  const weekoff = isWeekoff(d, assignment?.weekoffPatternJson);

  const punches = await AttendancePunch.findAll({
    where: { businessId, employeeId, date: d },
    order: [['punchAt', 'ASC']],
    transaction,
  });

  const firstIn = punches.find((p) => p.punchType === 'IN')?.punchAt || null;
  const lastOut = [...punches].reverse().find((p) => p.punchType === 'OUT')?.punchAt || null;
  const breakMinutes = calculateBreakMinutes(punches);

  let workMinutes = 0;
  if (firstIn && lastOut) workMinutes = Math.max(0, minutesDiff(lastOut, firstIn) - breakMinutes);

  const fullDayMins = Number(policy.fullDayMins ?? 480);
  const halfDayMins = Number(policy.halfDayMins ?? 240);
  const graceLate = Number(policy.graceMinutesLate ?? 0);
  const graceEarly = Number(policy.graceMinutesEarly ?? 0);
  const otEnabled = Boolean(policy.otEnabled ?? false);

  let lateMinutes = 0;
  let earlyMinutes = 0;
  let overtimeMinutes = 0;

  if (shift && firstIn) {
    const shiftStartM = parseTimeToMinutes(shift.startTime);
    const inM = new Date(firstIn).getHours() * 60 + new Date(firstIn).getMinutes();
    lateMinutes = Math.max(0, inM - shiftStartM - graceLate);
  }

  if (shift && lastOut) {
    const shiftEndM = parseTimeToMinutes(shift.endTime);
    const outM = new Date(lastOut).getHours() * 60 + new Date(lastOut).getMinutes();
    earlyMinutes = Math.max(0, shiftEndM - outM - graceEarly);
  }

  if (otEnabled) overtimeMinutes = Math.max(0, workMinutes - fullDayMins);

  const hasAnyPunch = !!(firstIn || lastOut || punches.length);

  // Status determination logic:
  // - If employee has punched in → calculate as PRESENT/LATE/HALF_DAY
  // - If no punch → show as NOT_MARKED (blank/empty state) - even if on approved leave
  // - Special cases (HOLIDAY, WEEKOFF) override when no punch
  let status = 'NOT_MARKED';  // Default: no action taken yet

  if (!hasAnyPunch) {
    // No punches at all - keep as NOT_MARKED initially
    // Special cases: only override if there's explicit marking and no punch
    if (holiday) {
      status = 'HOLIDAY';
    } else if (weekoff) {
      status = 'WEEKOFF';
    }
    // NOTE: Don't auto-set LEAVE status here - user must have actual action for it to show
    // LEAVE will be marked explicitly during regularization if needed
  } else {
    // If employee has punched in (regardless of punch out)
    if (firstIn) {
      // Calculate lateMinutes based on punch in time vs shift start time
      if (lateMinutes > 0) {
        status = 'LATE';  // Punched in late
      } else {
        status = 'PRESENT';  // Punched in on time
      }
    } else if (workMinutes >= fullDayMins && lateMinutes > 0) {
      status = 'LATE';
    } else if (workMinutes >= fullDayMins) {
      status = 'PRESENT';
    } else if (workMinutes >= halfDayMins) {
      status = 'HALF_DAY';
    } else {
      status = 'ABSENT';
    }
  }

  const [summary] = await AttendanceDailySummary.findOrCreate({
    where: { businessId, employeeId, date: d },
    defaults: {
      businessId,
      employeeId,
      date: d,
      firstInAt: firstIn,
      lastOutAt: lastOut,
      workMinutes,
      breakMinutes,
      lateMinutes,
      earlyMinutes,
      overtimeMinutes,
      status,
      source,
      notes,
      locked: false,
    },
    transaction,
  });

  await summary.update(
    { firstInAt: firstIn, lastOutAt: lastOut, workMinutes, breakMinutes, lateMinutes, earlyMinutes, overtimeMinutes, status, source, notes },
    { transaction }
  );

  return { summary, punches, assignment };
};

export const ensureDailySummariesForDate = async ({ businessId, date }) => {
  const d = toDateOnly(date);
  const employees = await Employee.findAll({ where: { businessId }, attributes: ['id'] });
  for (const emp of employees) {
    await recalculateDay({ businessId, employeeId: emp.id, date: d, source: 'AUTO' });
  }
  return true;
};

// -------------------- Employee Punch Actions --------------------

export const recordPunch = async ({ businessId, employeeId, date, punchType, punchAt = null, source = 'WEB', metaJson = {} }) => {
  const d = toDateOnly(date);
  await ensureNotLocked({ businessId, date: d });

  const existingPunches = await AttendancePunch.findAll({
    where: { businessId, employeeId, date: d },
    order: [['punchAt', 'ASC']],
  });
  const latest = existingPunches[existingPunches.length - 1];

  if (punchType === 'IN') {
    if (existingPunches.some((p) => p.punchType === 'IN')) {
      const err = new Error('Already clocked in for today');
      err.statusCode = 409;
      throw err;
    }
  }

  if (punchType === 'BREAK_START') {
    if (!existingPunches.some((p) => p.punchType === 'IN')) {
      const err = new Error('Clock-in required before starting break');
      err.statusCode = 409;
      throw err;
    }
    if (latest?.punchType === 'BREAK_START') {
      const err = new Error('Break already started');
      err.statusCode = 409;
      throw err;
    }
    if (existingPunches.some((p) => p.punchType === 'OUT')) {
      const err = new Error('Cannot start break after clock-out');
      err.statusCode = 409;
      throw err;
    }
  }

  if (punchType === 'BREAK_END') {
    if (latest?.punchType !== 'BREAK_START') {
      const err = new Error('Break start required before ending break');
      err.statusCode = 409;
      throw err;
    }
  }

  if (punchType === 'OUT') {
    if (!existingPunches.some((p) => p.punchType === 'IN')) {
      const err = new Error('Clock-in required before clock-out');
      err.statusCode = 409;
      throw err;
    }
    if (existingPunches.some((p) => p.punchType === 'OUT')) {
      const err = new Error('Already clocked out for today');
      err.statusCode = 409;
      throw err;
    }
    if (latest?.punchType === 'BREAK_START') {
      const err = new Error('End break before clocking out');
      err.statusCode = 409;
      throw err;
    }
  }

  const at = punchAt ? new Date(punchAt) : new Date();

  return sequelize.transaction(async (t) => {
    const punch = await AttendancePunch.create(
      { businessId, employeeId, date: d, punchType, punchAt: at, source, metaJson },
      { transaction: t }
    );

    const result = await recalculateDay({
      businessId,
      employeeId,
      date: d,
      source: source === 'MANUAL' ? 'MANUAL' : 'AUTO',
      transaction: t,
    });

    return { punch, ...result };
  });
};

export const getToday = async ({ businessId, employeeId, date }) => {
  const d = toDateOnly(date || new Date());
  const assignment = await getEffectiveAssignment({ businessId, employeeId, date: d });
  const calc = await recalculateDay({ businessId, employeeId, date: d, source: 'AUTO' });
  return { ...calc, assignment };
};

export const getCalendar = async ({ businessId, employeeId, month }) => {
  const { startStr, endStr } = startEndOfMonth(month);
  return AttendanceDailySummary.findAll({
    where: { businessId, employeeId, date: { [Op.gte]: startStr, [Op.lt]: endStr } },
    order: [['date', 'ASC']],
  });
};

const aggregateAttendanceStats = (summaries = []) => {
  const stats = {
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    halfDay: 0,
    holiday: 0,
    weekoff: 0,
    notMarked: 0,
    totalWorkMinutes: 0,
    recordedDays: 0,
  };

  summaries.forEach((s) => {
    stats.recordedDays += 1;
    stats.totalWorkMinutes += Number(s.workMinutes) || 0;
    switch (s.status) {
      case 'PRESENT': stats.present += 1; break;
      case 'ABSENT': stats.absent += 1; break;
      case 'LATE': stats.late += 1; break;
      case 'LEAVE': stats.leave += 1; break;
      case 'HALF_DAY': stats.halfDay += 1; break;
      case 'HOLIDAY': stats.holiday += 1; break;
      case 'WEEKOFF': stats.weekoff += 1; break;
      default: stats.notMarked += 1; break;
    }
  });

  const workingDays = stats.present + stats.absent + stats.late + stats.halfDay + stats.notMarked;
  stats.attendanceRate = workingDays > 0
    ? Math.round(((stats.present + stats.halfDay) / workingDays) * 100)
    : null;

  return stats;
};

export const getEmployeeAttendanceSummaries = async ({ businessId, month, department = null, search = null }) => {
  const { startStr, endStr } = startEndOfMonth(month);

  const empWhere = { businessId };
  if (department) empWhere.empDepartment = department;

  const employees = await Employee.findAll({
    where: empWhere,
    attributes: ['id', 'empName', 'empId', 'empDepartment', 'empDesignation', 'isActive'],
    order: [['empName', 'ASC']],
  });

  const summaries = await AttendanceDailySummary.findAll({
    where: { businessId, date: { [Op.gte]: startStr, [Op.lt]: endStr } },
    attributes: ['employeeId', 'status', 'workMinutes', 'date'],
    raw: true,
  });

  const byEmployee = {};
  summaries.forEach((row) => {
    if (!byEmployee[row.employeeId]) byEmployee[row.employeeId] = [];
    byEmployee[row.employeeId].push(row);
  });

  let rows = employees.map((employee) => ({
    employee,
    stats: aggregateAttendanceStats(byEmployee[employee.id] || []),
  }));

  if (search) {
    const q = String(search).toLowerCase();
    rows = rows.filter((r) => {
      const e = r.employee;
      return (
        (e.empName || '').toLowerCase().includes(q)
        || (e.empId || '').toLowerCase().includes(q)
        || (e.empDepartment || '').toLowerCase().includes(q)
      );
    });
  }

  return { month, startStr, endStr, rows };
};

export const getEmployeeAttendanceHistory = async ({ businessId, employeeId, month, startDate, endDate }) => {
  const employee = await Employee.findOne({
    where: { id: employeeId, businessId },
    attributes: ['id', 'empName', 'empId', 'empDepartment', 'empDesignation', 'isActive'],
  });
  if (!employee) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }

  let startStr;
  let endStr;
  let periodLabel;
  let dateWhere;

  if (month) {
    ({ startStr, endStr } = startEndOfMonth(month));
    periodLabel = month;
    dateWhere = { [Op.gte]: startStr, [Op.lt]: endStr };
  } else if (startDate && endDate) {
    startStr = toDateOnly(startDate);
    endStr = toDateOnly(endDate);
    periodLabel = `${startStr} to ${endStr}`;
    dateWhere = { [Op.between]: [startStr, endStr] };
  } else {
    const now = new Date();
    const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    ({ startStr, endStr } = startEndOfMonth(m));
    periodLabel = m;
    dateWhere = { [Op.gte]: startStr, [Op.lt]: endStr };
  }

  const days = await AttendanceDailySummary.findAll({
    where: { businessId, employeeId, date: dateWhere },
    order: [['date', 'ASC']],
  });

  const holidays = await Holiday.findAll({
    where: { businessId, date: dateWhere },
    attributes: ['id', 'date', 'name'],
    order: [['date', 'ASC']],
  });

  return {
    employee,
    period: periodLabel,
    startStr,
    endStr,
    stats: aggregateAttendanceStats(days),
    days,
    holidays,
  };
};

// -------------------- Admin: dashboard/logs --------------------

export const getDashboard = async ({ businessId, date }) => {
  const d = toDateOnly(date || new Date());
  await ensureDailySummariesForDate({ businessId, date: d });

  const summaries = await AttendanceDailySummary.findAll({
    where: { businessId, date: d },
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['id', 'empName', 'empId', 'empDepartment', 'empDesignation'],
        include: [
          {
            model: EmployeeShiftAssignment,
            as: 'shiftAssignments',
            attributes: ['shiftId'],
            where: { effectiveFrom: { [Op.lte]: d }, ...(true && { effectiveTo: { [Op.or]: [null, { [Op.gte]: d }] } }) },
            required: false,
            include: [
              { model: Shift, as: 'shift', attributes: ['id', 'name', 'startTime', 'endTime'] }
            ]
          }
        ]
      }
    ]
  });

  const counts = summaries.reduce(
    (acc, s) => {
      acc.total += 1;
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    },
    { total: 0, PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0, HALF_DAY: 0, HOLIDAY: 0, WEEKOFF: 0 }
  );

  const pendingRegularizations = await AttendanceRegularization.count({ where: { businessId, status: 'PENDING' } });
  return { date: d, counts, pendingRegularizations, summaries };
};

export const getAttendanceTrend = async ({ businessId, days = 30 }) => {
  const safeDays = Math.min(90, Math.max(7, Number(days) || 30));
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (safeDays - 1));
  const startStr = toDateOnly(start);
  const endStr = toDateOnly(end);

  const rows = await AttendanceDailySummary.findAll({
    where: { businessId, date: { [Op.between]: [startStr, endStr] } },
    attributes: ['date', 'status'],
    raw: true,
  });

  const trend = [];
  for (let i = 0; i < safeDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = toDateOnly(d);
    trend.push({
      date: key,
      label: safeDays > 14
        ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        : d.toLocaleDateString('en-GB', { weekday: 'short' }),
      present: 0,
      absent: 0,
      late: 0,
      onLeave: 0,
      notMarked: 0,
    });
  }

  const byDate = Object.fromEntries(trend.map((t) => [t.date, t]));
  rows.forEach((r) => {
    const bucket = byDate[r.date];
    if (!bucket) return;
    if (r.status === 'PRESENT' || r.status === 'HALF_DAY') bucket.present += 1;
    else if (r.status === 'ABSENT') bucket.absent += 1;
    else if (r.status === 'LATE') bucket.late += 1;
    else if (r.status === 'LEAVE') bucket.onLeave += 1;
    else if (r.status === 'NOT_MARKED') bucket.notMarked += 1;
  });

  return trend;
};

export const getAttendanceLogs = async ({ businessId, date, department = null, status = null }) => {
  const d = toDateOnly(date);
  await ensureDailySummariesForDate({ businessId, date: d });

  const where = { businessId, date: d };
  if (status) where.status = status;

  const logs = await AttendanceDailySummary.findAll({
    where,
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['id', 'empName', 'empId', 'empDepartment', 'empDesignation'],
        include: [
          {
            model: EmployeeShiftAssignment,
            as: 'shiftAssignments',
            attributes: ['shiftId'],
            where: { effectiveFrom: { [Op.lte]: d }, ...(true && { effectiveTo: { [Op.or]: [null, { [Op.gte]: d }] } }) },
            required: false,
            include: [
              { model: Shift, as: 'shift', attributes: ['id', 'name', 'startTime', 'endTime'] }
            ]
          }
        ]
      }
    ],
    order: [[{ model: Employee, as: 'employee' }, 'empName', 'ASC']],
  });

  if (!department) return logs;
  return logs.filter((l) => l.employee?.empDepartment === department);
};

export const manualEdit = async ({ businessId, employeeId, date, punches = [], note = null, actionByUserId = null }) => {
  const d = toDateOnly(date);
  await ensureNotLocked({ businessId, date: d });

  return sequelize.transaction(async (t) => {
    // NOTE: enterprise recommendation:
    // replace MANUAL punches for that date to avoid duplicates
    await AttendancePunch.destroy({
      where: { businessId, employeeId, date: d, source: 'MANUAL' },
      transaction: t,
    });

    for (const p of punches) {
      if (!p?.punchType || !p?.punchAt) continue;
      await AttendancePunch.create(
        {
          businessId,
          employeeId,
          date: d,
          punchType: p.punchType,
          punchAt: new Date(p.punchAt),
          source: 'MANUAL',
          metaJson: { actionByUserId, note },
        },
        { transaction: t }
      );
    }

    return recalculateDay({ businessId, employeeId, date: d, source: 'MANUAL', notes: note, transaction: t });
  });
};

// -------------------- Regularizations --------------------

export const listRegularizations = async ({ businessId, employeeId = null, status = null }) => {
  const where = { businessId };
  if (employeeId) where.employeeId = employeeId;
  if (status) where.status = status;

  return AttendanceRegularization.findAll({
    where,
    include: [{ model: Employee, as: 'employee', attributes: ['id', 'empName'] }],
    order: [['createdAt', 'DESC']],
  });
};

export const createRegularizationRequest = async ({ businessId, employeeId, date, type, requestedChangeJson = {}, reason = null }) => {
  const d = toDateOnly(date);
  await ensureNotLocked({ businessId, date: d });
  if (!businessId || !employeeId || !date || !type) throw new Error('businessId, employeeId, date, type are required');

  return AttendanceRegularization.create({
    businessId,
    employeeId,
    date: d,
    type,
    requestedChangeJson,
    reason,
    status: 'PENDING',
  });
};

export const approveRegularization = async ({ businessId, id, actionByUserId, actionNote = null }) => {
  const req = await AttendanceRegularization.findOne({ where: { id, businessId } });
  if (!req) {
    const err = new Error('Regularization not found');
    err.statusCode = 404;
    throw err;
  }

  await ensureNotLocked({ businessId, date: req.date });

  return sequelize.transaction(async (t) => {
    const punches = Array.isArray(req.requestedChangeJson?.punches) ? req.requestedChangeJson.punches : [];

    for (const p of punches) {
      if (!p?.punchType || !p?.punchAt) continue;
      await AttendancePunch.create(
        {
          businessId,
          employeeId: req.employeeId,
          date: req.date,
          punchType: p.punchType,
          punchAt: new Date(p.punchAt),
          source: 'REGULARIZED',
          metaJson: { regularizationId: req.id },
        },
        { transaction: t }
      );
    }

    await req.update(
      { status: 'APPROVED', actionByUserId, actionNote, actionAt: new Date() },
      { transaction: t }
    );

    const result = await recalculateDay({
      businessId,
      employeeId: req.employeeId,
      date: req.date,
      source: 'REGULARIZED',
      notes: actionNote,
      transaction: t,
    });

    return { regularization: req, ...result };
  });
};

export const rejectRegularization = async ({ businessId, id, actionByUserId, actionNote = null }) => {
  const req = await AttendanceRegularization.findOne({ where: { id, businessId } });
  if (!req) {
    const err = new Error('Regularization not found');
    err.statusCode = 404;
    throw err;
  }
  await req.update({ status: 'REJECTED', actionByUserId, actionNote, actionAt: new Date() });
  return req;
};

// -------------------- Lock / Unlock --------------------

export const lockPeriod = async ({ businessId, period, lockedByUserId }) => {
  if (!businessId || !period || !lockedByUserId) throw new Error('businessId, period, lockedByUserId are required');
  const { startStr, endStr } = startEndOfMonth(period);

  return sequelize.transaction(async (t) => {
    const [lock] = await AttendanceLock.findOrCreate({
      where: { businessId, period },
      defaults: { businessId, period, lockedByUserId, lockedAt: new Date() },
      transaction: t,
    });

    await AttendanceDailySummary.update(
      { locked: true },
      { where: { businessId, date: { [Op.gte]: startStr, [Op.lt]: endStr } }, transaction: t }
    );

    return lock;
  });
};

export const listLocks = async ({ businessId }) => {
  return AttendanceLock.findAll({
    where: { businessId },
    order: [['period', 'DESC']],
  });
};

export const unlockPeriod = async ({ businessId, period, unlockNote }) => {
  if (!businessId || !period) throw new Error('businessId and period are required');
  const { startStr, endStr } = startEndOfMonth(period);

  return sequelize.transaction(async (t) => {
    const lock = await AttendanceLock.findOne({ where: { businessId, period }, transaction: t });
    if (!lock) {
      const err = new Error('Lock not found');
      err.statusCode = 404;
      throw err;
    }

    await lock.destroy({ transaction: t });

    await AttendanceDailySummary.update(
      { locked: false },
      { where: { businessId, date: { [Op.gte]: startStr, [Op.lt]: endStr } }, transaction: t }
    );

    if (unlockNote) {
      await AttendanceDailySummary.update(
        { notes: sequelize.literal(`CONCAT(IFNULL(notes,''), '\\n[UNLOCK] ${unlockNote}')`) },
        { where: { businessId, date: { [Op.gte]: startStr, [Op.lt]: endStr } }, transaction: t }
      );
    }

    return true;
  });
};
