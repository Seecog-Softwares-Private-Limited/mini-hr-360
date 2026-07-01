import Employee from '../models/Employee.js';
import EmployeeLifecycleEvent from '../models/EmployeeLifecycleEvent.js';

const JOB_FIELDS = [
  'empDesignation',
  'empDepartment',
  'division',
  'subDepartment',
  'gradeBandLevel',
  'empWorkLoc',
  'workMode',
  'reportingManagerId',
];

const CHANGE_TYPES = new Set(['promotion', 'transfer', 'department_change', 'designation_change']);

export async function getJobChangeHistory(employeeId, limit = 12) {
  const events = await EmployeeLifecycleEvent.findAll({
    where: { employeeId },
    order: [['createdAt', 'DESC']],
    limit: 40,
  });

  return events
    .filter((e) => /promotion|transfer|job_/i.test(String(e.action || '')))
    .slice(0, limit)
    .map((e) => {
      const plain = e.get({ plain: true });
      return {
        id: plain.id,
        action: plain.action,
        changeType: plain.payload?.changeType || plain.action,
        effectiveDate: plain.payload?.effectiveDate || null,
        reason: plain.payload?.reason || null,
        before: plain.payload?.before || null,
        after: plain.payload?.after || null,
        createdAt: plain.createdAt,
      };
    });
}

export async function recordJobChange(employeeId, businessId, payload = {}, actorUserId = null) {
  const employee = await Employee.findOne({ where: { id: employeeId, businessId } });
  if (!employee) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }

  const changeType = String(payload.changeType || 'transfer').toLowerCase();
  if (!CHANGE_TYPES.has(changeType)) {
    const err = new Error('Invalid change type');
    err.statusCode = 400;
    throw err;
  }

  const before = {};
  const after = {};
  const updates = {};

  JOB_FIELDS.forEach((field) => {
    if (payload[field] !== undefined && payload[field] !== null && payload[field] !== '') {
      before[field] = employee[field];
      let value = payload[field];
      if (field === 'reportingManagerId') value = Number(value) || null;
      updates[field] = value;
      after[field] = value;
    }
  });

  if (!Object.keys(updates).length) {
    const err = new Error('Provide at least one job field to update');
    err.statusCode = 400;
    throw err;
  }

  Object.assign(employee, updates);
  await employee.save();

  const action = changeType === 'promotion'
    ? 'promotion'
    : changeType === 'transfer'
      ? 'transfer'
      : `job_${changeType}`;

  await EmployeeLifecycleEvent.create({
    employeeId,
    fromStage: employee.lifecycleStage,
    toStage: employee.lifecycleStage,
    action,
    actorUserId,
    payload: {
      changeType,
      effectiveDate: payload.effectiveDate || new Date().toISOString().split('T')[0],
      reason: payload.reason || null,
      before,
      after,
    },
  });

  return {
    employee: employee.get({ plain: true }),
    before,
    after,
    changeType,
  };
}
