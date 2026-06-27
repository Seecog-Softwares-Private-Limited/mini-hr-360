import path from 'path';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  listGeneratedDocumentsForPortal,
  getGeneratedDocumentForEmployee,
  resolveGeneratedDocumentPath,
  acknowledgeGeneratedDocument,
} from '../../services/generatedDocument.service.js';
import { getEmployeePortalLifecycleSummary } from '../../services/employeePortalLifecycle.service.js';

/**
 * GET /employee/hr-letters — HR-generated letters (offer, appointment, etc.)
 */
export const renderHrLettersPage = asyncHandler(async (req, res) => {
  const employee = req.employee;
  const letters = await listGeneratedDocumentsForPortal(employee.id);
  const lifecycle = await getEmployeePortalLifecycleSummary(employee);

  res.render('employee/documents/hr-letters', {
    title: 'My HR Letters',
    layout: 'employee-main',
    active: 'hr_letters',
    lifecycle,
    employee: {
      id: employee.id,
      empName: employee.empName,
      empId: employee.empId,
      empDesignation: employee.empDesignation,
    },
    letters,
  });
});

/**
 * GET /employee/api/hr-letters
 */
export const listHrLettersApi = asyncHandler(async (req, res) => {
  const letters = await listGeneratedDocumentsForPortal(req.employee.id);
  return res.json({ success: true, data: letters });
});

async function streamGeneratedDoc(req, res, inline = false) {
  const doc = await getGeneratedDocumentForEmployee(
    req.employee.id,
    parseInt(req.params.id, 10)
  );
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Letter not found' });
  }

  const abs = resolveGeneratedDocumentPath(doc.filePath);
  if (!abs) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  const disposition = inline ? 'inline' : 'attachment';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${doc.fileName || 'letter.pdf'}"`
  );
  return res.sendFile(path.resolve(abs));
}

export const previewHrLetter = asyncHandler((req, res) => streamGeneratedDoc(req, res, true));
export const downloadHrLetter = asyncHandler((req, res) => streamGeneratedDoc(req, res, false));

export const acknowledgeHrLetter = asyncHandler(async (req, res) => {
  const doc = await acknowledgeGeneratedDocument(
    req.employee.id,
    parseInt(req.params.id, 10)
  );
  return res.json({
    success: true,
    message: 'Letter acknowledged',
    acknowledgedAt: doc.acknowledgedAt,
  });
});

export const acceptOfferHrLetter = asyncHandler(async (req, res) => {
  const { acceptOfferFromPortal } = await import('../../services/portalOfferAcceptance.service.js');
  const result = await acceptOfferFromPortal(
    req.employee.id,
    parseInt(req.params.id, 10)
  );
  return res.json({
    success: true,
    message: 'Offer accepted. HR has been notified.',
    acknowledgedAt: result.acceptedAt,
    lifecycleStage: result.lifecycleStage,
  });
});
