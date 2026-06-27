import {
  getEmployeeLifecycleOverview,
  transitionLifecycleStage,
} from './employeeLifecycle.service.js';
import { LIFECYCLE_STAGE_LABELS } from '../config/lifecycleWorkflows.js';
import { labelForExitDoc } from '../config/exitDocumentLabels.js';
import { normalizeDocCode } from '../config/lifecycleWorkflows.js';
import DocumentType from '../models/DocumentType.js';

const ONBOARDING_STAGE_ORDER = ['prospect', 'offer', 'joining', 'active', 'confirmed'];

export async function getOnboardingWizardState(employeeId) {
  const overview = await getEmployeeLifecycleOverview(employeeId);
  if (!overview) return null;

  const stage = overview.employee.lifecycleStage;
  const isOnboarding = ONBOARDING_STAGE_ORDER.includes(stage);

  const generatedCodes = new Set(
    (overview.generatedDocuments || []).map((d) => normalizeDocCode(d.code))
  );

  const docTypes = await DocumentType.findAll({
    where: { isDeleted: false },
    attributes: ['id', 'code', 'name'],
  });
  const docTypeByCode = new Map(docTypes.map((dt) => [normalizeDocCode(dt.code), dt]));

  const onboardingDocs = (overview.allowedDocuments || []).filter((d) => {
    const c = normalizeDocCode(d.code);
    return !['RESIGNATION_ACCEPTANCE', 'NO_DUES_CLEARANCE', 'FULL_FINAL_STATEMENT', 'RELIEVING_LETTER', 'INTERNSHIP_CERT'].includes(c);
  });

  const documentSteps = onboardingDocs.map((d, index) => {
    const code = normalizeDocCode(d.code);
    return {
      order: index + 1,
      code,
      label: d.name,
      documentTypeId: d.id,
      generated: generatedCodes.has(code),
      gatesValid: d.gatesValid,
      missingFields: d.missingFields,
      recommended: overview.recommendedDocument?.id === d.id,
    };
  });

  const suggestedActions = [];
  if (stage === 'offer') {
    suggestedActions.push({
      key: 'accept_offer',
      label: 'Accept offer → Joining',
      description: 'Record offer acceptance and move employee to joining stage.',
      method: 'POST',
      endpoint: `/api/v1/employees/${employeeId}/lifecycle/offer/accept`,
    });
  }
  if (stage === 'joining') {
    suggestedActions.push({
      key: 'generate_appointment',
      label: 'Generate appointment letter',
      description: 'Issue probation/appointment letter to move to active.',
      href: `/documents?employeeId=${employeeId}`,
    });
  }
  if (stage === 'active') {
    suggestedActions.push({
      key: 'confirm_employment',
      label: 'Confirm employment',
      description: 'Mark probation complete and move to confirmed stage.',
      method: 'POST',
      endpoint: `/api/v1/employees/${employeeId}/lifecycle/confirm`,
    });
  }

  return {
    ...overview,
    isOnboarding,
    documentSteps,
    suggestedActions,
    stageLabels: ONBOARDING_STAGE_ORDER.map((s) => ({
      key: s,
      label: LIFECYCLE_STAGE_LABELS[s],
      current: s === stage,
      completed: ONBOARDING_STAGE_ORDER.indexOf(s) < ONBOARDING_STAGE_ORDER.indexOf(stage),
    })),
  };
}

export async function patchOnboardingStage(employeeId, stage, actorUserId) {
  const Employee = (await import('../models/Employee.js')).default;
  const employee = await Employee.findByPk(employeeId);
  if (!employee) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }
  return transitionLifecycleStage(employee, stage, {
    action: 'manual_onboarding_stage',
    actorUserId,
  });
}
