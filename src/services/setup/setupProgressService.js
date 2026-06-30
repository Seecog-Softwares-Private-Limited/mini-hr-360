import OrganizationSetupProgress from '../../models/OrganizationSetupProgress.js';
import SalaryComponent from '../../models/payroll.SalaryComponent.js';
import { LeaveType } from '../../models/LeaveType.js';

export const SETUP_STEPS = [
  { key: 'company_details', title: 'Company Details', order: 1 },
  { key: 'branches', title: 'Branches and Locations', order: 2 },
  { key: 'departments_designations', title: 'Departments and Designations', order: 3 },
  { key: 'leave_policies', title: 'Leave Policies', order: 4 },
  { key: 'attendance_rules', title: 'Attendance Rules', order: 5 },
  { key: 'invite_employees', title: 'Invite Employees', order: 6 },
];

const STEP_PERCENT = Math.round((100 / SETUP_STEPS.length) * 100) / 100;

/** Map legacy 8-step wizard progress to the current 6-step flow. */
export function normalizeWizardStep(order) {
  const n = Number(order) || 1;
  if (n <= 5) return n;
  return SETUP_STEPS.length;
}

export async function ensureSetupProgress(businessId) {
  let progress = await OrganizationSetupProgress.findOne({ where: { businessId } });
  if (!progress) {
    progress = await OrganizationSetupProgress.create({
      businessId,
      currentStep: 1,
      completedSteps: {},
      skippedSteps: {},
      setupCompleted: false,
    });
  } else {
    const normalized = normalizeWizardStep(progress.currentStep);
    if (normalized !== progress.currentStep) {
      await progress.update({ currentStep: normalized });
      await progress.reload();
    }
  }
  return progress;
}

export async function markStepCompleted(businessId, stepKey) {
  const progress = await ensureSetupProgress(businessId);
  const completedSteps = { ...(progress.completedSteps || {}), [stepKey]: true };
  const stepOrder = SETUP_STEPS.find((s) => s.key === stepKey)?.order || progress.currentStep;
  const nextIncomplete = SETUP_STEPS.find((s) => !completedSteps[s.key] && !(progress.skippedSteps || {})[s.key]);
  await progress.update({
    completedSteps,
    currentStep: nextIncomplete?.order || stepOrder,
  });
  return progress.reload();
}

export async function skipStep(businessId, stepKey, reason = '') {
  const progress = await ensureSetupProgress(businessId);
  const skippedSteps = { ...(progress.skippedSteps || {}), [stepKey]: reason || true };
  await progress.update({ skippedSteps });
  return progress.reload();
}

export async function finishSetup(businessId) {
  const progress = await ensureSetupProgress(businessId);
  await progress.update({
    setupCompleted: true,
    completedAt: new Date(),
  });
  return progress.reload();
}

export async function seedDefaultSetupData(businessId) {
  const existingLeave = await LeaveType.count({ where: { businessId, status: 'ACTIVE' } });
  if (existingLeave === 0) {
    const defaults = [
      { name: 'Casual Leave', code: 'CL', maxPerYear: 12, isPaid: true, color: '#6366f1' },
      { name: 'Sick Leave', code: 'SL', maxPerYear: 10, isPaid: true, color: '#ef4444' },
      { name: 'Earned Leave', code: 'EL', maxPerYear: 15, isPaid: true, allowCarryForward: true, maxCarryForward: 5, color: '#22c55e' },
    ];
    for (const lt of defaults) {
      await LeaveType.create({
        businessId,
        status: 'ACTIVE',
        policyConfig: { monthlyAccrual: false, approvalFlow: 'MANAGER_HR' },
        ...lt,
      });
    }
  }

  const existingComponents = await SalaryComponent.count({ where: { businessId, status: 'active' } });
  if (existingComponents === 0) {
    const components = [
      { name: 'Basic', code: 'BASIC', type: 'EARNING', componentType: 'earning', calculationType: 'PERCENTAGE', value: 40, isDefault: true },
      { name: 'HRA', code: 'HRA', type: 'EARNING', componentType: 'earning', calculationType: 'PERCENTAGE', value: 20, isDefault: true },
      { name: 'Special Allowance', code: 'SA', type: 'EARNING', componentType: 'earning', calculationType: 'PERCENTAGE', value: 40, isDefault: true },
    ];
    for (const c of components) {
      await SalaryComponent.create({ businessId, status: 'active', showInPayslip: true, isTaxable: true, ...c });
    }
  }
}

export { STEP_PERCENT };
