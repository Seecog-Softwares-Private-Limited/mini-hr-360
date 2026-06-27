import { sendDocumentEmail } from '../utils/emailService.js';
import { saveGeneratedDocument } from './generatedDocument.service.js';
import { buildLifecycleDocumentEmail } from './lifecycleEmail.service.js';
import {
  onDocumentGenerated,
  normalizeDocCode,
} from './employeeLifecycle.service.js';
import { syncEmployeeSalaryStructure } from './employeePayrollSync.service.js';
import { autoTickChecklistForDocument } from './offboardingChecklist.service.js';
import { notifyDocumentGeneratedForEmployee } from './lifecycleNotification.service.js';

function buildEmailContent({ employee, docType, code, templateData }) {
  return buildLifecycleDocumentEmail({ employee, docType, code, templateData });
}

/**
 * Send email with PDF attachment, save to vault, lifecycle transition, checklist auto-tick, payroll sync.
 */
export async function finalizeDocumentDelivery({
  employee,
  docType,
  code,
  pdfBuffer,
  fileName,
  templateData = {},
  actorUserId = null,
  postGenerateMeta = {},
  skipEmail = false,
}) {
  const normalizedCode = normalizeDocCode(code);
  let emailSent = false;
  let emailAttempted = false;
  let emailError = null;

  if (!skipEmail && employee.empEmail) {
    const { subject, html } = await buildEmailContent({
      employee,
      docType,
      code: normalizedCode,
      templateData,
    });

    emailAttempted = true;
    const result = await sendDocumentEmail({
      to: employee.empEmail,
      cc: process.env.HR_CC_EMAIL || 'sonam@seecogsoftwares.com',
      subject,
      html,
      pdfBuffer,
      fileName,
    });

    emailSent = result.success;
    emailError = result.error || null;
  }

  if (normalizedCode === 'SALARY_SLIP' && emailAttempted && !emailSent) {
    const err = new Error(emailError || 'Failed to send salary slip email');
    err.statusCode = 500;
    throw err;
  }

  const vaultRecord = await saveGeneratedDocument({
    employeeId: employee.id,
    documentTypeId: docType.id,
    code: normalizedCode,
    pdfBuffer,
    fileName,
    generatedByUserId: actorUserId,
    metadata: {
      documentTypeName: docType.name,
      employeeName: employee.empName,
      emailSent,
      ...postGenerateMeta,
    },
  });

  const refreshed = await onDocumentGenerated(employee, normalizedCode, {
    actorUserId,
    metadata: postGenerateMeta,
  });

  await autoTickChecklistForDocument(employee.id, normalizedCode, actorUserId);

  if (!skipEmail && employee.businessId) {
    notifyDocumentGeneratedForEmployee({
      businessId: employee.businessId,
      employee,
      docCode: normalizedCode,
      docLabel: docType.name,
    }).catch(() => {});
  }

  if (normalizedCode === 'OFFER_LETTER' || normalizedCode === 'PRE_PLACEMENT_OFFER') {
    try {
      await syncEmployeeSalaryStructure({
        employeeId: employee.id,
        ctc: employee.empCtc,
        effectiveDate: employee.empDateOfJoining,
        reason: `document_${normalizedCode}`,
      });
    } catch (payErr) {
      console.error('Payroll sync after offer letter:', payErr);
    }
  }

  if (normalizedCode === 'PROBATION_LETTER') {
    try {
      await syncEmployeeSalaryStructure({
        employeeId: employee.id,
        ctc: employee.empCtc,
        effectiveDate: employee.empDateOfJoining,
        reason: 'document_PROBATION_LETTER',
      });
    } catch (payErr) {
      console.error('Payroll sync after appointment letter:', payErr);
    }
  }

  if (normalizedCode === 'INCREMENT_LETTER' && postGenerateMeta?.revisedAnnualCtc) {
    try {
      await syncEmployeeSalaryStructure({
        employeeId: employee.id,
        ctc: postGenerateMeta.revisedAnnualCtc,
        effectiveDate: employee.empIncrementEffectiveDate || new Date().toISOString().slice(0, 10),
        reason: 'document_INCREMENT_LETTER',
      });
    } catch (payErr) {
      console.error('Payroll sync after increment letter:', payErr);
    }
  }

  return {
    emailSent,
    emailAttempted,
    vaultRecord,
    lifecycleStage: refreshed.lifecycleStage,
  };
}
