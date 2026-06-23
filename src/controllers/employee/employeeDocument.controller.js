import path from 'path';
import fs from 'fs';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  DOCUMENT_CATEGORIES,
  listEmployeeDocuments,
  getEmployeeDocumentForAccess,
  getExpiryReminders,
  getVaultSummary,
  formatDocumentForVault,
  resolveDocumentFile,
  mimeFromPath,
} from '../../services/employeeDocument.service.js';

function getFileSourceFromDoc(doc) {
  return doc.fileUrl || doc.documentImageUrl || null;
}

/**
 * GET /employee/documents — Document vault page
 */
export const renderDocumentsVault = asyncHandler(async (req, res) => {
  const employee = req.employee;
  const documents = await listEmployeeDocuments(employee.id);
  const reminders = await getExpiryReminders(employee.id);
  const summary = getVaultSummary(documents);

  res.render('employee/documents/vault', {
    title: 'Documents Vault',
    layout: 'employee-main',
    active: 'documents',
    employee: {
      id: employee.id,
      empName: employee.empName,
      empId: employee.empId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      empDesignation: employee.empDesignation,
    },
    categories: DOCUMENT_CATEGORIES,
    documents,
    reminders,
    summary,
  });
});

/**
 * GET /employee/api/documents?category=
 */
export const listDocumentsApi = asyncHandler(async (req, res) => {
  const employee = req.employee;
  const category = req.query.category || 'ALL';
  const documents = await listEmployeeDocuments(employee.id, { category });
  const reminders = await getExpiryReminders(employee.id);

  return res.json({
    success: true,
    data: {
      documents,
      reminders,
      summary: getVaultSummary(await listEmployeeDocuments(employee.id)),
    },
  });
});

/**
 * GET /employee/documents/:id/preview
 */
export const previewDocument = asyncHandler(async (req, res) => {
  const employee = req.employee;
  const doc = await getEmployeeDocumentForAccess(employee.id, parseInt(req.params.id, 10));

  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  const source = getFileSourceFromDoc(doc);
  if (!source) {
    return res.status(404).json({ success: false, message: 'No file attached to this document' });
  }

  const resolved = resolveDocumentFile(source);
  if (!resolved) {
    return res.status(404).json({ success: false, message: 'File not found on server' });
  }

  if (resolved.type === 'external') {
    return res.redirect(resolved.url);
  }

  const mime = mimeFromPath(resolved.path);
  const filename = path.basename(resolved.path);
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.sendFile(resolved.path);
});

/**
 * GET /employee/documents/:id/download
 */
export const downloadDocument = asyncHandler(async (req, res) => {
  const employee = req.employee;
  const doc = await getEmployeeDocumentForAccess(employee.id, parseInt(req.params.id, 10));

  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  const source = getFileSourceFromDoc(doc);
  if (!source) {
    return res.status(404).json({ success: false, message: 'No file attached to this document' });
  }

  const resolved = resolveDocumentFile(source);
  if (!resolved) {
    return res.status(404).json({ success: false, message: 'File not found on server' });
  }

  if (resolved.type === 'external') {
    return res.redirect(resolved.url);
  }

  const plain = doc.get ? doc.get({ plain: true }) : doc;
  const ext = path.extname(resolved.path) || '';
  const downloadName = `${(plain.documentType || 'document').replace(/[^\w\-]+/g, '_')}${ext}`;
  res.download(resolved.path, downloadName);
});

/**
 * GET /employee/api/documents/:id
 */
export const getDocumentDetail = asyncHandler(async (req, res) => {
  const doc = await getEmployeeDocumentForAccess(req.employee.id, parseInt(req.params.id, 10));
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  return res.json({
    success: true,
    data: formatDocumentForVault(doc, req.employee.id),
  });
});

export default {
  renderDocumentsVault,
  listDocumentsApi,
  previewDocument,
  downloadDocument,
  getDocumentDetail,
};
