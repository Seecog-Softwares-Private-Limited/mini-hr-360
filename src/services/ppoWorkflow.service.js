import Employee from '../models/Employee.js';
import DocumentType from '../models/DocumentType.js';
import {
  getEmployeeLifecycleOverview,
  convertInternToPermanent,
  validateDocumentGates,
} from './employeeLifecycle.service.js';
import { normalizeDocCode, LIFECYCLE_STAGE_LABELS } from '../config/lifecycleWorkflows.js';

export function isPaidIntern(employee) {
  const stipend = Number(employee.internStipend || employee.empStipend || 0);
  const ctc = Number(employee.empCtc || 0);
  return stipend > 0 || ctc > 0;
}

export async function getPpoWizardState(employeeId) {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) return null;

  if (employee.employeeType !== 'Intern') {
    const err = new Error('PPO workflow applies only to Intern employees');
    err.statusCode = 400;
    throw err;
  }

  const overview = await getEmployeeLifecycleOverview(employeeId);
  const paid = isPaidIntern(employee);

  const ppoType = await DocumentType.findOne({
    where: { code: 'PRE_PLACEMENT_OFFER', isDeleted: false },
    attributes: ['id', 'code', 'name'],
  });

  const generatedCodes = new Set(
    (overview.generatedDocuments || []).map((d) => normalizeDocCode(d.code))
  );

  const gates = ppoType
    ? validateDocumentGates(employee, ppoType.code)
    : { valid: false, missing: ['PRE_PLACEMENT_OFFER document type'] };

  const internshipEnd = employee.internship_end_date || employee.internshipEndDate;

  return {
    ...overview,
    intern: {
      paid,
      monthlyStipend: Number(employee.internStipend || 0),
      internshipStart: employee.internship_start_date,
      internshipEnd,
      canConvert: ['active', 'confirmed', 'offer', 'joining'].includes(employee.lifecycleStage),
    },
    ppoStep: {
      code: 'PRE_PLACEMENT_OFFER',
      label: ppoType?.name || 'Pre-Placement Offer (PPO)',
      documentTypeId: ppoType?.id || null,
      generated: generatedCodes.has('PRE_PLACEMENT_OFFER'),
      gatesValid: gates.valid,
      missingFields: gates.missing || [],
    },
    employee: {
      ...overview.employee,
      empCtc: employee.empCtc,
      empDateOfJoining: employee.empDateOfJoining,
      empDesignation: employee.empDesignation,
      lifecycleStageLabel:
        LIFECYCLE_STAGE_LABELS[employee.lifecycleStage] || employee.lifecycleStage,
    },
  };
}

export async function executePpoConversion(employeeId, payload, actorUserId) {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }
  if (employee.employeeType !== 'Intern') {
    const err = new Error('Only intern employees can be converted via PPO');
    err.statusCode = 400;
    throw err;
  }

  const { empCtc, empDateOfJoining, empDesignation } = payload;
  if (empCtc == null || empCtc === '') {
    const err = new Error('empCtc (annual) is required for permanent conversion');
    err.statusCode = 400;
    throw err;
  }
  if (!empDateOfJoining) {
    const err = new Error('empDateOfJoining is required for permanent conversion');
    err.statusCode = 400;
    throw err;
  }

  return convertInternToPermanent(
    employeeId,
    {
      empCtc: Number(empCtc),
      empDateOfJoining,
      empDesignation: empDesignation || employee.empDesignation,
    },
    actorUserId
  );
}

export async function initiateInternCompletionExit(employeeId, actorUserId, payload = {}) {
  const employee = await Employee.findByPk(employeeId);
  if (!employee || employee.employeeType !== 'Intern') {
    const err = new Error('Intern employee not found');
    err.statusCode = 404;
    throw err;
  }

  const { initiateExitWithNotifications } = await import('./exitWorkflow.service.js');
  const lastWorkingDay =
    payload.lastWorkingDay ||
    employee.internship_end_date ||
    employee.lastWorkingDay;

  if (!lastWorkingDay) {
    const err = new Error('Set internship end date or last working day');
    err.statusCode = 400;
    throw err;
  }

  const paid = isPaidIntern(employee);

  return initiateExitWithNotifications(
    employeeId,
    {
      lastWorkingDay,
      exitType: paid ? 'internship_end' : 'internship_end',
      exitReason: payload.exitReason || (paid ? 'Paid internship completed' : 'Unpaid internship completed'),
      employmentStatus: 'Internship Completed',
    },
    actorUserId
  );
}
