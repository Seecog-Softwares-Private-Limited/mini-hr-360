import Employee from '../models/Employee.js';
import DocumentType from '../models/DocumentType.js';
import {
  getEmployeeLifecycleOverview,
  initiateEmployeeExit,
  completeEmployeeExit,
  updateOffboardingChecklist,
} from './employeeLifecycle.service.js';
import { normalizeDocCode } from '../config/lifecycleWorkflows.js';
import { labelForExitDoc } from '../config/exitDocumentLabels.js';
import { checklistProgress, mergeChecklist } from '../config/offboardingChecklist.js';
import {
  notifyExitInitiated,
  notifyExitCompleted,
  notifyChecklistItemDone,
} from './lifecycleNotification.service.js';

export async function getExitWizardState(employeeId) {
  const overview = await getEmployeeLifecycleOverview(employeeId);
  if (!overview) return null;

  const generatedCodes = new Set(
    (overview.generatedDocuments || []).map((d) => normalizeDocCode(d.code))
  );

  const docTypes = await DocumentType.findAll({
    where: { isDeleted: false },
    attributes: ['id', 'code', 'name'],
  });
  const docTypeByCode = new Map(
    docTypes.map((dt) => [normalizeDocCode(dt.code), dt])
  );

  const documentSteps = (overview.exitSequence || []).map((code, index) => {
    const normalized = normalizeDocCode(code);
    const dt = docTypeByCode.get(normalized);
    return {
      order: index + 1,
      code: normalized,
      label: labelForExitDoc(normalized),
      documentTypeId: dt?.id || null,
      documentTypeName: dt?.name || labelForExitDoc(normalized),
      generated: generatedCodes.has(normalized),
    };
  });

  const docsComplete = documentSteps.length
    ? documentSteps.every((s) => s.generated)
    : true;
  const checklist = overview.offboardingProgress || { percent: 0, done: 0, total: 0 };
  const checklistComplete = checklist.percent >= 100;

  const employee = await Employee.findByPk(employeeId, {
    attributes: ['fnfSettlement', 'resignationDate', 'lastWorkingDay', 'exitType', 'exitReason'],
  });

  return {
    ...overview,
    documentSteps,
    fnfSettlement: employee?.fnfSettlement || null,
    readiness: {
      docsComplete,
      checklistComplete,
      canCompleteExit: docsComplete && checklistComplete,
      exitFieldsSet: Boolean(employee?.lastWorkingDay),
    },
  };
}

export async function saveFnfSettlement(employeeId, payload, actorUserId) {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }

  employee.fnfSettlement = {
    ...(employee.fnfSettlement || {}),
    ...payload,
    updatedAt: new Date().toISOString(),
    updatedByUserId: actorUserId,
  };
  await employee.save();
  return employee.fnfSettlement;
}

export async function initiateExitWithNotifications(employeeId, payload, actorUserId) {
  const updated = await initiateEmployeeExit(employeeId, payload, actorUserId);
  if (updated.businessId) {
    await notifyExitInitiated({
      businessId: updated.businessId,
      employee: updated,
      actorUserId,
    }).catch((e) => console.warn('Exit notification failed:', e.message));
  }
  return updated;
}

export async function completeExitWithValidation(employeeId, actorUserId, { force = false } = {}) {
  const state = await getExitWizardState(employeeId);
  if (!state) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }

  if (!force && !state.readiness.canCompleteExit) {
    const err = new Error(
      'Cannot complete exit: all exit documents and checklist items must be finished.'
    );
    err.statusCode = 400;
    err.readiness = state.readiness;
    throw err;
  }

  const updated = await completeEmployeeExit(employeeId, actorUserId);
  if (updated.businessId) {
    await notifyExitCompleted({
      businessId: updated.businessId,
      employee: updated,
      actorUserId,
    }).catch((e) => console.warn('Exit complete notification failed:', e.message));
  }
  return updated;
}

export async function updateChecklistWithNotifications(employeeId, items, actorUserId) {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }

  const before = mergeChecklist(employee.offboardingChecklist, employee.employeeType);
  const result = await updateOffboardingChecklist(employeeId, items, actorUserId);

  if (employee.businessId) {
    const after = result.checklist || [];
    after.forEach((item) => {
      const prev = before.find((b) => b.key === item.key);
      if (item.done && !prev?.done) {
        notifyChecklistItemDone({
          businessId: employee.businessId,
          employee,
          item,
          actorUserId,
        }).catch(() => {});
      }
    });
  }

  return result;
}
