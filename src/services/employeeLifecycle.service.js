import Employee from '../models/Employee.js';
import EmployeeLifecycleEvent from '../models/EmployeeLifecycleEvent.js';
import DocumentType from '../models/DocumentType.js';
import {
  LIFECYCLE_STAGES,
  LIFECYCLE_STAGE_LABELS,
  WORKFLOW_MATRIX,
  DOCUMENT_GATES,
  POST_DOCUMENT_STAGE,
  RECOMMENDED_NEXT,
  EXIT_DOCUMENT_SEQUENCE,
  INTERN_EXIT_SEQUENCE,
  normalizeDocCode,
} from '../config/lifecycleWorkflows.js';
import { listGeneratedDocuments } from './generatedDocument.service.js';
import { syncEmployeeSalaryStructure } from './employeePayrollSync.service.js';
import { getEmployeePayrollLinkStatus } from './payrollLifecycle.service.js';
import { notifyStageTransition } from './lifecycleNotification.service.js';
import {
  mergeChecklist,
  checklistProgress,
  getDefaultChecklistForType,
} from '../config/offboardingChecklist.js';

export { normalizeDocCode } from '../config/lifecycleWorkflows.js';

const FIELD_LABELS = {
  empName: 'Employee name',
  empEmail: 'Email',
  empDesignation: 'Designation',
  empDepartment: 'Department',
  empWorkLoc: 'Work location',
  empCtc: 'CTC (annual)',
  empDateOfJoining: 'Joining date',
  resignationDate: 'Resignation date',
  lastWorkingDay: 'Last working day',
  contractEndDate: 'Contract end date',
  internStipend: 'Monthly stipend',
};

function isBlank(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
}

function getEmployeeType(employee) {
  return employee.employeeType || 'Permanent';
}

function getLifecycleStage(employee) {
  return employee.lifecycleStage || 'prospect';
}

function getMonthlyStipend(employee) {
  const direct = Number(employee.internStipend || employee.empStipend || 0);
  if (direct > 0) return direct;
  const ctc = Number(employee.empCtc || 0);
  return ctc > 0 ? ctc / 12 : 0;
}

export function validateDocumentGates(employee, docCode) {
  const code = normalizeDocCode(docCode);
  const required = DOCUMENT_GATES[code] || ['empName'];
  const missing = [];

  for (const field of required) {
    const val = employee[field];
    if (field === 'empCtc') {
      if (val === null || val === undefined || val === '') {
        missing.push(FIELD_LABELS[field] || field);
      }
      continue;
    }
    if (isBlank(val)) {
      missing.push(FIELD_LABELS[field] || field);
    }
  }

  if (code === 'INTERNSHIP_OFFER') {
    const stipend = getMonthlyStipend(employee);
    const hasDates =
      employee.internship_start_date ||
      employee.internshipStartDate ||
      employee.empDateOfJoining;
    if (!hasDates) {
      missing.push('Internship start date (or joining date)');
    }
    if (stipend === 0 && Number(employee.empCtc || 0) === 0) {
      // unpaid intern — allowed
    }
  }

  if (code === 'INCREMENT_LETTER' && Number(employee.empCtc || 0) <= 0) {
    missing.push('Current CTC must be set before increment letter');
  }

  if (
    (getEmployeeType(employee) === 'Contract' || getEmployeeType(employee) === 'Consultant') &&
    code === 'PROBATION_LETTER' &&
    isBlank(employee.contractEndDate)
  ) {
    missing.push(FIELD_LABELS.contractEndDate);
  }

  return {
    valid: missing.length === 0,
    missing,
    code,
  };
}

export function getAllowedDocumentCodes(employee) {
  const type = getEmployeeType(employee);
  const stage = getLifecycleStage(employee);
  const matrix = WORKFLOW_MATRIX[type] || WORKFLOW_MATRIX.Permanent;
  const stageList = matrix[stage] || [];
  return [...new Set(stageList)];
}

export function isDocumentAllowed(employee, docCode) {
  const normalized = normalizeDocCode(docCode);
  const allowed = getAllowedDocumentCodes(employee);
  return allowed.includes(normalized);
}

export function getNextRecommendedDocumentCode(employee) {
  const type = getEmployeeType(employee);
  const stage = getLifecycleStage(employee);
  const map = RECOMMENDED_NEXT[type] || RECOMMENDED_NEXT.Permanent;
  return map[stage] || null;
}

export async function transitionLifecycleStage(employee, newStage, { action, actorUserId, payload } = {}) {
  const fromStage = employee.lifecycleStage || 'prospect';
  if (!LIFECYCLE_STAGES.includes(newStage)) {
    throw new Error(`Invalid lifecycle stage: ${newStage}`);
  }

  const stageOrder = LIFECYCLE_STAGES.indexOf(newStage);
  const fromOrder = LIFECYCLE_STAGES.indexOf(fromStage);
  if (stageOrder < fromOrder && newStage !== 'offboarding') {
    // allow offboarding from any active stage
  }

  employee.lifecycleStage = newStage;

  if (newStage === 'exited') {
    employee.isActive = false;
    if (!employee.employmentStatus || employee.employmentStatus === 'Active') {
      employee.employmentStatus = 'Resigned';
    }
  }

  await employee.save();

  await EmployeeLifecycleEvent.create({
    employeeId: employee.id,
    fromStage,
    toStage: newStage,
    action: action || 'stage_transition',
    actorUserId: actorUserId || null,
    payload: payload || null,
  });

  if (employee.businessId && fromStage !== newStage) {
    notifyStageTransition({
      businessId: employee.businessId,
      employee,
      fromStage,
      toStage: newStage,
      action,
      actorUserId,
    }).catch((e) => console.warn('Stage notification failed:', e.message));
  }

  return employee;
}

export async function onDocumentGenerated(employee, docCode, { actorUserId, metadata } = {}) {
  const code = normalizeDocCode(docCode);
  const nextStage = POST_DOCUMENT_STAGE[code];
  if (!nextStage) return employee;

  const current = getLifecycleStage(employee);
  const currentIdx = LIFECYCLE_STAGES.indexOf(current);
  const nextIdx = LIFECYCLE_STAGES.indexOf(nextStage);

  if (nextIdx > currentIdx || nextStage === 'offboarding' || nextStage === 'exited') {
    return transitionLifecycleStage(employee, nextStage, {
      action: `document_generated:${code}`,
      actorUserId,
      payload: metadata,
    });
  }

  return employee;
}

export async function loadEmployeeForLifecycle(employeeId) {
  return Employee.findByPk(employeeId, {
    include: [
      {
        model: Employee,
        as: 'reportingManager',
        attributes: ['id', 'empName', 'empDesignation', 'empId'],
        required: false,
      },
    ],
  });
}

export function enrichEmployeeForDocuments(employee) {
  const plain = employee.get ? employee.get({ plain: true }) : { ...employee };
  const manager = plain.reportingManager;
  if (manager) {
    plain.reportingManagerName = manager.empName || '';
    plain.reportingManagerDesignation = manager.empDesignation || '';
  }
  return plain;
}

export async function getEmployeeLifecycleOverview(employeeId) {
  const employee = await loadEmployeeForLifecycle(employeeId);
  if (!employee) return null;

  const plain = enrichEmployeeForDocuments(employee);
  const stage = getLifecycleStage(plain);
  const type = getEmployeeType(plain);
  const allowedCodes = getAllowedDocumentCodes(plain);
  const recommendedCode = getNextRecommendedDocumentCode(plain);

  const documentTypes = await DocumentType.findAll({
    where: { isDeleted: false },
    order: [['name', 'ASC']],
  });

  const allowedDocuments = documentTypes
    .filter((dt) => allowedCodes.includes(normalizeDocCode(dt.code)))
    .map((dt) => {
      const gates = validateDocumentGates(plain, dt.code);
      return {
        id: dt.id,
        name: dt.name,
        code: dt.code,
        icon: dt.icon,
        gatesValid: gates.valid,
        missingFields: gates.missing,
      };
    });

  const recommended = allowedDocuments.find(
    (d) => normalizeDocCode(d.code) === recommendedCode
  ) || null;

  const events = await EmployeeLifecycleEvent.findAll({
    where: { employeeId },
    order: [['createdAt', 'DESC']],
    limit: 20,
  });

  const generatedDocs = await listGeneratedDocuments(employeeId, { limit: 20 });

  const checklist = mergeChecklist(plain.offboardingChecklist, type);
  const checklistStats = checklistProgress(checklist);

  const payrollLink = await getEmployeePayrollLinkStatus(employeeId).catch(() => null);

  const exitSequence =
    type === 'Intern' ? INTERN_EXIT_SEQUENCE : EXIT_DOCUMENT_SEQUENCE;

  return {
    employee: {
      id: plain.id,
      empId: plain.empId,
      empName: plain.empName,
      employeeType: type,
      lifecycleStage: stage,
      lifecycleStageLabel: LIFECYCLE_STAGE_LABELS[stage] || stage,
      employmentStatus: plain.employmentStatus,
      isActive: plain.isActive,
      empCtc: plain.empCtc,
      internStipend: plain.internStipend,
      isPaidIntern: type === 'Intern' ? getMonthlyStipend(plain) > 0 : null,
    },
    allowedDocuments,
    recommendedDocument: recommended,
    exitSequence,
    events: events.map((e) => e.get({ plain: true })),
    generatedDocuments: generatedDocs.map((d) => d.get({ plain: true })),
    offboardingChecklist: checklist,
    offboardingProgress: checklistStats,
    payrollLink,
    stages: LIFECYCLE_STAGES.map((s) => ({
      key: s,
      label: LIFECYCLE_STAGE_LABELS[s],
      current: s === stage,
      completed: LIFECYCLE_STAGES.indexOf(s) < LIFECYCLE_STAGES.indexOf(stage),
    })),
  };
}

export async function initiateEmployeeExit(employeeId, payload, actorUserId) {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) throw new Error('Employee not found');

  if (payload.resignationDate) employee.resignationDate = payload.resignationDate;
  if (payload.lastWorkingDay) employee.lastWorkingDay = payload.lastWorkingDay;
  if (payload.noticePeriodDays != null) {
    employee.noticePeriodDays = Number(payload.noticePeriodDays);
  }
  if (payload.exitReason) employee.exitReason = payload.exitReason;
  if (payload.exitType) employee.exitType = payload.exitType;
  if (payload.exitCategory) employee.exitCategory = payload.exitCategory;

  employee.employmentStatus = payload.employmentStatus || 'Resigned';
  employee.exitStatus = 'in_progress';
  employee.offboardingChecklist = mergeChecklist(employee.offboardingChecklist, employee.employeeType);

  await employee.save();

  return transitionLifecycleStage(employee, 'offboarding', {
    action: 'exit_initiated',
    actorUserId,
    payload,
  });
}

export async function completeEmployeeExit(employeeId, actorUserId) {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) throw new Error('Employee not found');

  employee.isActive = false;
  employee.employmentStatus = employee.employmentStatus || 'Resigned';
  employee.exitStatus = 'completed';
  await employee.save();

  return transitionLifecycleStage(employee, 'exited', {
    action: 'exit_completed',
    actorUserId,
  });
}

export async function applyIncrementCtc(employeeId, revisedAnnualCtc, effectiveDate, actorUserId) {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) throw new Error('Employee not found');

  const oldCtc = Number(employee.empCtc || 0);
  employee.empCtc = Number(revisedAnnualCtc);
  if (effectiveDate) employee.empIncrementEffectiveDate = effectiveDate;
  await employee.save();

  let payrollSync = null;
  try {
    payrollSync = await syncEmployeeSalaryStructure({
      employeeId,
      ctc: employee.empCtc,
      effectiveDate: effectiveDate || employee.empIncrementEffectiveDate,
      reason: 'increment_letter',
    });
  } catch (syncErr) {
    console.error('Payroll sync after increment failed:', syncErr);
  }

  await EmployeeLifecycleEvent.create({
    employeeId,
    fromStage: employee.lifecycleStage,
    toStage: employee.lifecycleStage,
    action: 'ctc_updated_post_increment',
    actorUserId,
    payload: { oldCtc, newCtc: Number(revisedAnnualCtc), effectiveDate, payrollSync },
  });

  return { employee, payrollSync };
}

export async function convertInternToPermanent(employeeId, payload, actorUserId) {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) throw new Error('Employee not found');

  employee.employeeType = 'Permanent';
  if (payload.empCtc != null) employee.empCtc = Number(payload.empCtc);
  if (payload.empDateOfJoining) employee.empDateOfJoining = payload.empDateOfJoining;
  if (payload.empDesignation) employee.empDesignation = payload.empDesignation;
  await employee.save();

  return transitionLifecycleStage(employee, 'joining', {
    action: 'intern_converted_to_permanent',
    actorUserId,
    payload,
  });
}

export async function updateOffboardingChecklist(employeeId, items, actorUserId) {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) throw new Error('Employee not found');

  const merged = mergeChecklist(items, employee.employeeType).map((item) => ({
    ...item,
    completedAt: item.done ? item.completedAt || new Date().toISOString() : null,
  }));

  employee.offboardingChecklist = merged;
  await employee.save();

  await EmployeeLifecycleEvent.create({
    employeeId,
    fromStage: employee.lifecycleStage,
    toStage: employee.lifecycleStage,
    action: 'offboarding_checklist_updated',
    actorUserId,
    payload: { progress: checklistProgress(merged) },
  });

  return { checklist: merged, progress: checklistProgress(merged) };
}

export async function syncPayrollForEmployee(employeeId, { ctc, effectiveDate, reason } = {}) {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) throw new Error('Employee not found');

  const annualCtc = ctc != null ? Number(ctc) : Number(employee.empCtc || 0);
  return syncEmployeeSalaryStructure({
    employeeId,
    ctc: annualCtc,
    effectiveDate: effectiveDate || employee.empDateOfJoining,
    reason: reason || 'manual_sync',
  });
}

export async function acceptEmployeeOffer(employeeId, payload = {}, actorUserId) {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) throw new Error('Employee not found');

  const stage = getLifecycleStage(employee);
  if (stage !== 'offer' && stage !== 'prospect') {
    const err = new Error(`Offer acceptance is only available at offer stage (current: ${stage})`);
    err.statusCode = 400;
    throw err;
  }

  if (payload.empDateOfJoining) employee.empDateOfJoining = payload.empDateOfJoining;
  if (payload.reportingManagerId) employee.reportingManagerId = Number(payload.reportingManagerId);
  if (payload.workMode) employee.workMode = payload.workMode;
  employee.employmentStatus = 'Active';
  await employee.save();

  return transitionLifecycleStage(employee, 'joining', {
    action: 'offer_accepted',
    actorUserId,
    payload,
  });
}

export async function confirmEmployeeEmployment(employeeId, payload = {}, actorUserId) {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) throw new Error('Employee not found');

  const stage = getLifecycleStage(employee);
  if (!['active', 'joining'].includes(stage)) {
    const err = new Error(`Confirmation is only available for active/joining employees (current: ${stage})`);
    err.statusCode = 400;
    throw err;
  }

  employee.confirmationDate = payload.confirmationDate || employee.confirmationDate || new Date().toISOString().slice(0, 10);
  employee.employmentStatus = 'Confirmed';
  await employee.save();

  return transitionLifecycleStage(employee, 'confirmed', {
    action: 'employment_confirmed',
    actorUserId,
    payload: { confirmationDate: employee.confirmationDate },
  });
}
