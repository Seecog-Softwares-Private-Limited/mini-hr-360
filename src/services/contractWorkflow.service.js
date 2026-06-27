import Employee from '../models/Employee.js';
import EmployeeLifecycleEvent from '../models/EmployeeLifecycleEvent.js';
import { getEmployeeLifecycleOverview } from './employeeLifecycle.service.js';
import { initiateExitWithNotifications } from './exitWorkflow.service.js';
import { syncPayrollForEmployee } from './employeeLifecycle.service.js';
import { LIFECYCLE_STAGE_LABELS } from '../config/lifecycleWorkflows.js';

const CONTRACT_TYPES = new Set(['Contract', 'Consultant']);

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  if (isNaN(end.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

export async function getContractWizardState(employeeId) {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) return null;

  const type = employee.employeeType || 'Permanent';
  if (!CONTRACT_TYPES.has(type)) {
    const err = new Error('Contract workflow applies only to Contract or Consultant employees');
    err.statusCode = 400;
    throw err;
  }

  const overview = await getEmployeeLifecycleOverview(employeeId);
  const daysRemaining = daysUntil(employee.contractEndDate);

  return {
    ...overview,
    contract: {
      contractEndDate: employee.contractEndDate,
      daysRemaining,
      isExpired: daysRemaining != null && daysRemaining < 0,
      isEndingSoon: daysRemaining != null && daysRemaining >= 0 && daysRemaining <= 30,
      canRenew: employee.lifecycleStage !== 'exited',
      canNonRenew: ['active', 'confirmed', 'joining', 'offer'].includes(employee.lifecycleStage),
    },
    employee: {
      ...overview.employee,
      empCtc: employee.empCtc,
      contractEndDate: employee.contractEndDate,
      lifecycleStageLabel:
        LIFECYCLE_STAGE_LABELS[employee.lifecycleStage] || employee.lifecycleStage,
    },
  };
}

export async function renewContract(employeeId, payload, actorUserId) {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }
  if (!CONTRACT_TYPES.has(employee.employeeType)) {
    const err = new Error('Employee is not on a contract track');
    err.statusCode = 400;
    throw err;
  }

  const { contractEndDate, empCtc, syncPayroll } = payload;
  if (!contractEndDate) {
    const err = new Error('contractEndDate is required for renewal');
    err.statusCode = 400;
    throw err;
  }

  const prevEnd = employee.contractEndDate;
  employee.contractEndDate = contractEndDate;
  if (empCtc != null && empCtc !== '') {
    employee.empCtc = Number(empCtc);
  }
  await employee.save();

  let payrollResult = null;
  if (syncPayroll && employee.empCtc) {
    payrollResult = await syncPayrollForEmployee(employeeId, {
      ctc: employee.empCtc,
      effectiveDate: contractEndDate,
      reason: 'contract_renewal',
    }).catch((e) => ({ error: e.message }));
  }

  await EmployeeLifecycleEvent.create({
    employeeId,
    fromStage: employee.lifecycleStage,
    toStage: employee.lifecycleStage,
    action: 'contract_renewed',
    actorUserId,
    payload: { prevEnd, newEnd: contractEndDate, empCtc: employee.empCtc, payrollResult },
  });

  return { employee, payrollResult };
}

export async function initiateContractNonRenewal(employeeId, actorUserId, payload = {}) {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }
  if (!CONTRACT_TYPES.has(employee.employeeType)) {
    const err = new Error('Employee is not on a contract track');
    err.statusCode = 400;
    throw err;
  }

  const lastWorkingDay =
    payload.lastWorkingDay || employee.contractEndDate || employee.lastWorkingDay;
  if (!lastWorkingDay) {
    const err = new Error('Set contract end date or last working day before non-renewal exit');
    err.statusCode = 400;
    throw err;
  }

  return initiateExitWithNotifications(
    employeeId,
    {
      lastWorkingDay,
      exitType: 'contract_end',
      exitCategory: 'Involuntary',
      exitReason: payload.exitReason || 'Contract not renewed — scheduled expiry',
      employmentStatus: 'Contract Ended',
      noticePeriodDays: payload.noticePeriodDays ?? 0,
    },
    actorUserId
  );
}
