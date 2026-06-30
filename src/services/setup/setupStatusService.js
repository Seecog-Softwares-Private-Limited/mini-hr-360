import { Op } from 'sequelize';
import { Business } from '../../models/Business.js';
import { Department } from '../../models/Department.js';
import { Designation } from '../../models/Designation.js';
import { LeaveType } from '../../models/LeaveType.js';
import Employee from '../../models/Employee.js';
import Shift from '../../models/Shift.js';
import BusinessAddress from '../../models/BusinessAddress.js';
import BranchLocation from '../../models/BranchLocation.js';
import AttendanceRule from '../../models/AttendanceRule.js';
import { ensureSetupProgress, SETUP_STEPS, STEP_PERCENT, normalizeWizardStep } from './setupProgressService.js';

async function getRegisteredAddress(businessId) {
  return BusinessAddress.findOne({
    where: { businessId, addressType: 'REGISTERED', status: 'ACTIVE' },
    order: [['createdAt', 'ASC']],
  });
}

export async function evaluateStepCompletion(businessId) {
  const business = await Business.findByPk(businessId);
  const progress = await ensureSetupProgress(businessId);
  const registeredAddress = await getRegisteredAddress(businessId);

  const branches = await BranchLocation.count({ where: { businessId, status: 'ACTIVE' } });
  const primaryBranch = await BranchLocation.findOne({ where: { businessId, isPrimary: true, status: 'ACTIVE' } });

  const deptCount = await Department.count({ where: { businessId, status: 'ACTIVE' } });
  const desigCount = await Designation.count({ where: { businessId, status: 'ACTIVE' } });

  const leaveTypes = await LeaveType.findAll({ where: { businessId, status: 'ACTIVE' } });
  const activeLeavePolicies = leaveTypes.filter((lt) => {
    const cfg = lt.policyConfig || {};
    return lt.maxPerYear != null || Object.keys(cfg).length > 0;
  });

  const attendanceRule = await AttendanceRule.findOne({ where: { businessId } });
  const activeShifts = await Shift.count({ where: { businessId, status: 'ACTIVE' } });

  const employees = await Employee.count({
    where: { businessId, isActive: true },
  });
  const ownerIsOnlyEmployee = employees <= 1;

  const missingItems = [];

  const step1 = {
    complete: !!(
      (business?.legalName || business?.businessName)
      && business?.panNumber
      && (registeredAddress?.fullAddress || business?.description)
      && business?.city
      && business?.state
      && business?.country
      && business?.pincode
      && business?.timezone
    ),
  };
  if (!business?.legalName && !business?.businessName) {
    missingItems.push({ step: 'Company Details', severity: 'warning', message: 'Legal company name is missing' });
  }
  if (!business?.panNumber) {
    missingItems.push({ step: 'Company Details', severity: 'critical', message: 'PAN number is missing' });
  }
  if (!business?.city || !business?.state || !business?.pincode) {
    missingItems.push({ step: 'Company Details', severity: 'warning', message: 'Complete registered address (city/state/pincode)' });
  }

  const step2 = { complete: branches > 0 && !!primaryBranch };
  if (branches === 0) {
    missingItems.push({ step: 'Branches and Locations', severity: 'warning', message: 'No branch/location configured' });
  }
  if (branches > 0 && !primaryBranch) {
    missingItems.push({ step: 'Branches and Locations', severity: 'warning', message: 'No primary branch designated' });
  }

  const step3 = { complete: deptCount > 0 && desigCount > 0 };
  if (deptCount === 0) {
    missingItems.push({ step: 'Departments and Designations', severity: 'warning', message: 'No department created' });
  }
  if (desigCount === 0) {
    missingItems.push({ step: 'Departments and Designations', severity: 'warning', message: 'No designation created' });
  }

  const step4 = { complete: leaveTypes.length > 0 && activeLeavePolicies.length > 0 };
  if (leaveTypes.length === 0) {
    missingItems.push({ step: 'Leave Policies', severity: 'warning', message: 'No leave type configured' });
  }
  if (leaveTypes.length > 0 && activeLeavePolicies.length === 0) {
    missingItems.push({ step: 'Leave Policies', severity: 'warning', message: 'No active leave policy configured' });
  }

  const workWeekOk = attendanceRule?.workWeekConfig?.type || attendanceRule?.workWeekConfig?.days?.length;
  const step5 = { complete: !!attendanceRule && activeShifts > 0 && !!workWeekOk };
  if (!attendanceRule) {
    missingItems.push({ step: 'Attendance Rules', severity: 'warning', message: 'Attendance rules not configured' });
  }
  if (activeShifts === 0) {
    missingItems.push({ step: 'Attendance Rules', severity: 'warning', message: 'No active shift configured' });
  }

  const skippedInvite = !!(progress.skippedSteps || {}).invite_employees;
  const step6 = { complete: (!ownerIsOnlyEmployee && employees > 1) || skippedInvite };
  if (!step6.complete) {
    missingItems.push({ step: 'Invite Employees', severity: 'info', message: 'Invite employees or skip this step' });
  }

  try {
    const employeesWithoutPan = await Employee.count({
      where: {
        businessId,
        isActive: true,
        [Op.or]: [{ pan: null }, { pan: '' }],
      },
    });
    if (employeesWithoutPan > 0 && employees > 1) {
      missingItems.push({
        step: 'Invite Employees',
        severity: 'info',
        message: `${employeesWithoutPan} employee PAN number${employeesWithoutPan > 1 ? 's' : ''} missing`,
      });
    }
  } catch {
    // pan field may not exist on all deployments
  }

  const stepResults = {
    company_details: step1,
    branches: step2,
    departments_designations: step3,
    leave_policies: step4,
    attendance_rules: step5,
    invite_employees: step6,
  };

  const completedCount = SETUP_STEPS.filter((s) => stepResults[s.key]?.complete).length;
  const score = Math.round(completedCount * STEP_PERCENT * 10) / 10;

  const steps = SETUP_STEPS.map((s) => ({
    key: s.key,
    title: s.title,
    completed: stepResults[s.key]?.complete || false,
    percentage: STEP_PERCENT,
  }));

  const criticalMissing = missingItems.filter((m) => m.severity === 'critical');

  return {
    score,
    setupCompleted: progress.setupCompleted,
    currentStep: normalizeWizardStep(progress.currentStep),
    completedSteps: progress.completedSteps || {},
    skippedSteps: progress.skippedSteps || {},
    steps,
    missingItems,
    canFinish: criticalMissing.length === 0,
    criticalMissing,
    stepResults,
  };
}

export async function getSetupStatus(businessId) {
  return evaluateStepCompletion(businessId);
}
