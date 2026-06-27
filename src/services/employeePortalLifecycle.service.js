import {
  LIFECYCLE_STAGE_LABELS,
  LIFECYCLE_STAGES,
} from '../config/lifecycleWorkflows.js';
import { listGeneratedDocumentsForPortal } from './generatedDocument.service.js';

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function daysBetween(from, to) {
  return Math.ceil((to - from) / (1000 * 60 * 60 * 24));
}

/**
 * Self-service lifecycle summary for the employee portal dashboard.
 */
export async function getEmployeePortalLifecycleSummary(employee) {
  const stage = employee.lifecycleStage || 'prospect';
  const type = employee.employeeType || 'Permanent';
  const stageLabel = LIFECYCLE_STAGE_LABELS[stage] || stage;

  let probationEndDate = null;
  let probationDaysRemaining = null;
  if (employee.empDateOfJoining && Number(employee.probationPeriodMonths) > 0) {
    const start = new Date(employee.empDateOfJoining);
    if (!isNaN(start.getTime())) {
      const end = addMonths(start, Number(employee.probationPeriodMonths));
      probationEndDate = end.toISOString().slice(0, 10);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      probationDaysRemaining = daysBetween(now, end);
    }
  }

  let contractDaysRemaining = null;
  if (employee.contractEndDate && ['Contract', 'Consultant'].includes(type)) {
    const end = new Date(employee.contractEndDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    contractDaysRemaining = daysBetween(now, end);
  }

  const stageMessages = {
    prospect: 'Your profile is being set up by HR.',
    offer: 'An offer may be pending — check HR Letters when available.',
    joining: 'Complete your joining formalities with HR.',
    active: 'You are an active team member.',
    confirmed: 'Your employment is confirmed.',
    offboarding: 'Exit process is in progress. Contact HR for clearance steps.',
    exited: 'Your employment with the organization has ended.',
  };

  let nextHint = stageMessages[stage] || '';
  if (stage === 'active' && probationDaysRemaining != null && probationDaysRemaining > 0) {
    nextHint = `Probation ends on ${probationEndDate} (${probationDaysRemaining} days remaining).`;
  } else if (stage === 'active' && probationDaysRemaining != null && probationDaysRemaining <= 0) {
    nextHint = 'Probation period has ended — confirmation may be pending with HR.';
  }
  if (contractDaysRemaining != null && contractDaysRemaining >= 0 && contractDaysRemaining <= 30) {
    nextHint = `Contract ends in ${contractDaysRemaining} day(s) (${employee.contractEndDate}).`;
  }

  const letters = await listGeneratedDocumentsForPortal(employee.id).catch(() => []);
  const unacknowledged = letters.filter((l) => !l.acknowledged).length;

  const stageIndex = LIFECYCLE_STAGES.indexOf(stage);
  const progressPercent = stage === 'exited'
    ? 100
    : Math.round((stageIndex / (LIFECYCLE_STAGES.length - 1)) * 100);

  return {
    lifecycleStage: stage,
    lifecycleStageLabel: stageLabel,
    employeeType: type,
    statusMessage: nextHint,
    probationEndDate,
    probationDaysRemaining,
    contractEndDate: employee.contractEndDate || null,
    contractDaysRemaining,
    progressPercent,
    hrLettersCount: letters.length,
    unacknowledgedLetters: unacknowledged,
    showHrLettersLink: letters.length > 0 || ['offer', 'joining', 'active', 'confirmed'].includes(stage),
    lastWorkingDay: employee.lastWorkingDay || null,
    employmentStatus: employee.employmentStatus,
  };
}
