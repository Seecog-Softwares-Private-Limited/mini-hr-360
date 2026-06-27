import Employee from '../models/Employee.js';
import EmployeeGeneratedDocument from '../models/EmployeeGeneratedDocument.js';
import { normalizeDocCode } from '../config/lifecycleWorkflows.js';
import { acceptEmployeeOffer } from './employeeLifecycle.service.js';
import { notifyLifecycleAlert } from './lifecycleNotification.service.js';

export const PORTAL_OFFER_DOCUMENT_CODES = new Set([
  'OFFER_LETTER',
  'INTERNSHIP_OFFER',
  'PRE_PLACEMENT_OFFER',
]);

export function isPortalOfferDocumentCode(code) {
  return PORTAL_OFFER_DOCUMENT_CODES.has(normalizeDocCode(code));
}

/**
 * Employee self-service offer acceptance from HR Letters portal.
 */
export async function acceptOfferFromPortal(employeeId, docId) {
  const doc = await EmployeeGeneratedDocument.findOne({
    where: { id: docId, employeeId },
  });
  if (!doc) {
    const err = new Error('Letter not found');
    err.statusCode = 404;
    throw err;
  }

  const code = normalizeDocCode(doc.code);
  if (!isPortalOfferDocumentCode(code)) {
    const err = new Error('This letter does not support offer acceptance');
    err.statusCode = 400;
    throw err;
  }

  const employee = await Employee.findByPk(employeeId);
  if (!employee) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }

  const acceptedAt = new Date();
  const metadata = {
    ...(doc.metadata || {}),
    offerAcceptedAt: acceptedAt.toISOString(),
    offerAcceptedBy: 'employee_portal',
    offerDocumentCode: code,
  };

  doc.acknowledgedAt = doc.acknowledgedAt || acceptedAt;
  doc.metadata = metadata;
  await doc.save();

  let lifecycleStage = employee.lifecycleStage;
  if (employee.lifecycleStage === 'offer') {
    const updated = await acceptEmployeeOffer(
      employeeId,
      { source: 'employee_portal', documentId: docId },
      null
    );
    lifecycleStage = updated.lifecycleStage;
  }

  if (employee.businessId) {
    await notifyLifecycleAlert({
      businessId: employee.businessId,
      title: `Offer accepted: ${employee.empName}`,
      message: `${employee.empName} accepted ${code.replace(/_/g, ' ')} via the employee portal.`,
      link: `/onboarding-workflow/${employee.id}`,
      priority: 'HIGH',
      metadata: { event: 'offer_accepted_portal', employeeId, documentId: docId, code },
    }).catch(() => {});
  }

  return { doc, lifecycleStage, acceptedAt };
}
