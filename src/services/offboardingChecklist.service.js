import Employee from '../models/Employee.js';
import EmployeeLifecycleEvent from '../models/EmployeeLifecycleEvent.js';
import { DOCUMENT_CHECKLIST_AUTO_TICK } from '../config/documentApproval.js';
import { normalizeDocCode } from '../config/lifecycleWorkflows.js';
import {
  mergeChecklist,
  checklistProgress,
} from '../config/offboardingChecklist.js';

export async function autoTickChecklistForDocument(employeeId, docCode, actorUserId = null) {
  const normalized = normalizeDocCode(docCode);
  const checklistKey = DOCUMENT_CHECKLIST_AUTO_TICK[normalized];
  if (!checklistKey) return null;

  const employee = await Employee.findByPk(employeeId);
  if (!employee) return null;

  const merged = mergeChecklist(employee.offboardingChecklist, employee.employeeType);
  const item = merged.find((i) => i.key === checklistKey);
  if (!item || item.done) {
    return { updated: false, checklist: merged };
  }

  item.done = true;
  item.completedAt = new Date().toISOString();
  item.notes = item.notes || `Auto-completed on ${normalized} generation`;

  employee.offboardingChecklist = merged;
  await employee.save();

  await EmployeeLifecycleEvent.create({
    employeeId,
    fromStage: employee.lifecycleStage,
    toStage: employee.lifecycleStage,
    action: 'offboarding_checklist_auto_tick',
    actorUserId,
    payload: { key: checklistKey, documentCode: normalized },
  });

  return { updated: true, checklist: merged, progress: checklistProgress(merged) };
}
