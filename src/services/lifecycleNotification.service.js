import { notifyBusinessAdmins, notifyByRole } from './notification.service.js';
import { DEPARTMENT_NOTIFY_ROLES } from '../config/offboardingChecklist.js';
import { LIFECYCLE_STAGE_LABELS } from '../config/lifecycleWorkflows.js';
import { createNotification } from './notification.service.js';

const LIFECYCLE_META = { category: 'lifecycle' };

export async function notifyExitInitiated({ businessId, employee, actorUserId }) {
  const link = `/exit-workflow/${employee.id}`;
  const title = `Exit initiated: ${employee.empName}`;
  const message = `Last working day: ${employee.lastWorkingDay || 'TBD'}. Complete offboarding checklist and exit documents.`;

  await notifyBusinessAdmins({
    businessId,
    userIds: actorUserId ? [actorUserId] : [],
    type: 'SYSTEM_ALERT',
    title,
    message,
    priority: 'HIGH',
    link,
    entityType: 'Employee',
    entityId: employee.id,
    metadata: { ...LIFECYCLE_META, event: 'exit_initiated' },
  });

  for (const role of ['HR_MANAGER', 'HR_EXECUTIVE', 'FINANCE']) {
    await notifyByRole({
      role,
      businessId,
      type: 'INFO',
      title,
      message,
      priority: 'MEDIUM',
      link,
      entityType: 'Employee',
      entityId: employee.id,
      metadata: { ...LIFECYCLE_META, event: 'exit_initiated' },
    }).catch(() => {});
  }
}

export async function notifyExitCompleted({ businessId, employee, actorUserId }) {
  await notifyBusinessAdmins({
    businessId,
    userIds: actorUserId ? [actorUserId] : [],
    type: 'INFO',
    title: `Exit completed: ${employee.empName}`,
    message: 'Employee marked as exited and deactivated.',
    link: `/employees`,
    entityType: 'Employee',
    entityId: employee.id,
    metadata: { ...LIFECYCLE_META, event: 'exit_completed' },
  });
}

export async function notifyChecklistItemDone({
  businessId,
  employee,
  item,
  actorUserId,
}) {
  const role = DEPARTMENT_NOTIFY_ROLES[item.department];
  if (!role) return;

  await notifyByRole({
    role,
    businessId,
    type: 'INFO',
    title: `Clearance: ${item.label}`,
    message: `${employee.empName} — ${item.department} item marked complete.`,
    link: `/exit-workflow/${employee.id}`,
    entityType: 'Employee',
    entityId: employee.id,
    metadata: {
      ...LIFECYCLE_META,
      event: 'checklist_item_done',
      checklistKey: item.key,
      department: item.department,
      actorUserId,
    },
  }).catch(() => {});
}

export async function notifyLifecycleAlert({
  businessId,
  title,
  message,
  link,
  priority = 'MEDIUM',
  metadata = {},
}) {
  await notifyBusinessAdmins({
    businessId,
    type: 'SYSTEM_ALERT',
    title,
    message,
    priority,
    link,
    metadata: { ...LIFECYCLE_META, ...metadata },
  });

  await notifyByRole({
    role: 'HR_MANAGER',
    businessId,
    type: 'INFO',
    title,
    message,
    priority,
    link,
    metadata: { ...LIFECYCLE_META, ...metadata },
  }).catch(() => {});
}

export async function notifyStageTransition({
  businessId,
  employee,
  fromStage,
  toStage,
  action,
  actorUserId,
}) {
  if (!businessId || !employee || fromStage === toStage) return;

  const fromLabel = LIFECYCLE_STAGE_LABELS[fromStage] || fromStage;
  const toLabel = LIFECYCLE_STAGE_LABELS[toStage] || toStage;
  const title = `Lifecycle: ${employee.empName} → ${toLabel}`;
  const message = `Stage changed from ${fromLabel} to ${toLabel}${action ? ` (${action})` : ''}.`;
  const link =
    toStage === 'offboarding' || toStage === 'exited'
      ? `/exit-workflow/${employee.id}`
      : `/employees`;

  await notifyLifecycleAlert({
    businessId,
    title,
    message,
    link,
    priority: toStage === 'offboarding' ? 'HIGH' : 'MEDIUM',
    metadata: { event: 'stage_transition', fromStage, toStage, action, actorUserId },
  }).catch(() => {});

  if (employee.userId) {
    await createNotification({
      userId: employee.userId,
      businessId,
      type: 'INFO',
      title: `Employment update: ${toLabel}`,
      message,
      priority: 'MEDIUM',
      link: '/employee/hr-letters',
      entityType: 'Employee',
      entityId: employee.id,
      metadata: { ...LIFECYCLE_META, event: 'stage_transition', toStage },
    }).catch(() => {});
  }
}

export async function notifyDocumentGeneratedForEmployee({
  businessId,
  employee,
  docCode,
  docLabel,
}) {
  if (!employee?.userId) return;

  await createNotification({
    userId: employee.userId,
    businessId,
    type: 'INFO',
    title: `New HR letter: ${docLabel || docCode}`,
    message: 'A new document has been issued to you. View and acknowledge it in HR Letters.',
    priority: 'MEDIUM',
    link: '/employee/hr-letters',
    entityType: 'Employee',
    entityId: employee.id,
    metadata: { ...LIFECYCLE_META, event: 'document_generated', code: docCode },
  }).catch(() => {});
}

export async function notifyOfferPendingApproval({ businessId, employeeName, approvalRequestId }) {
  await notifyLifecycleAlert({
    businessId,
    title: 'Offer letter pending approval',
    message: `${employeeName} — offer letter awaits HR approval before send.`,
    link: '/document-approvals',
    priority: 'HIGH',
    metadata: { event: 'offer_pending_approval', approvalRequestId },
  }).catch(() => {});
}
