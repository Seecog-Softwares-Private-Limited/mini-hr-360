import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Employee from '../models/Employee.js';
import EmployeeDocument from '../models/EmployeeDocument.js';
import EmployeeGeneratedDocument from '../models/EmployeeGeneratedDocument.js';
import { Op } from 'sequelize';
import { normalizeDocCode } from '../config/lifecycleWorkflows.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_ROOT = path.join(__dirname, '..', '..', 'storage', 'employee-documents');

/**
 * Persist generated PDF to storage, audit table, and employee document vault.
 */
export async function saveGeneratedDocument({
  employeeId,
  documentTypeId,
  code,
  pdfBuffer,
  fileName,
  generatedByUserId = null,
  metadata = {},
}) {
  const employeeDir = path.join(STORAGE_ROOT, String(employeeId));
  if (!fs.existsSync(employeeDir)) {
    fs.mkdirSync(employeeDir, { recursive: true });
  }

  const timestamp = Date.now();
  const safeName = fileName || `${code}-${timestamp}.pdf`;
  const diskName = `${timestamp}-${safeName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const absolutePath = path.join(employeeDir, diskName);
  fs.writeFileSync(absolutePath, pdfBuffer);

  const relativePath = path.join('storage', 'employee-documents', String(employeeId), diskName);

  const priorCount = await EmployeeGeneratedDocument.count({
    where: { employeeId, code },
  });

  const generated = await EmployeeGeneratedDocument.create({
    employeeId,
    documentTypeId,
    code,
    fileName: safeName,
    filePath: relativePath,
    generatedByUserId,
    metadata,
    version: priorCount + 1,
  });

  const docTypeLabel = metadata.documentTypeName || code.replace(/_/g, ' ');

  await EmployeeDocument.create({
    employeeId,
    category: 'HR',
    documentType: docTypeLabel,
    nameOnDocument: metadata.employeeName || null,
    issueDate: new Date().toISOString().slice(0, 10),
    verificationStatus: 'Verified',
    fileUrl: relativePath,
    notes: `Auto-generated ${code} v${priorCount + 1}`,
  });

  return {
    generatedDocument: generated,
    filePath: relativePath,
    absolutePath,
  };
}

export async function listGeneratedDocuments(employeeId, { limit = 50 } = {}) {
  return EmployeeGeneratedDocument.findAll({
    where: { employeeId },
    order: [['createdAt', 'DESC']],
    limit,
  });
}

export function resolveGeneratedDocumentPath(relativePath) {
  if (!relativePath) return null;
  if (path.isAbsolute(relativePath)) return relativePath;
  return path.join(__dirname, '..', '..', relativePath);
}

export async function getGeneratedDocumentForEmployee(employeeId, docId) {
  return EmployeeGeneratedDocument.findOne({
    where: { id: docId, employeeId },
  });
}

export function formatGeneratedDocumentForPortal(doc) {
  const plain = doc.get ? doc.get({ plain: true }) : doc;
  const codeLabel = String(plain.code || '').replace(/_/g, ' ');
  const code = normalizeDocCode(plain.code);
  const meta = plain.metadata || {};
  const isOfferDoc = ['OFFER_LETTER', 'INTERNSHIP_OFFER', 'PRE_PLACEMENT_OFFER'].includes(code);
  return {
    id: plain.id,
    code: plain.code,
    normalizedCode: code,
    label: codeLabel,
    fileName: plain.fileName,
    version: plain.version,
    createdAt: plain.createdAt,
    acknowledgedAt: plain.acknowledgedAt,
    acknowledged: Boolean(plain.acknowledgedAt),
    offerAccepted: Boolean(meta.offerAcceptedAt),
    offerAcceptedAt: meta.offerAcceptedAt || null,
    isOfferDocument: isOfferDoc,
    canAcceptOffer: isOfferDoc && !meta.offerAcceptedAt,
    downloadUrl: `/employee/hr-letters/${plain.id}/download`,
    previewUrl: `/employee/hr-letters/${plain.id}/preview`,
  };
}

export async function acknowledgeGeneratedDocument(employeeId, docId) {
  const doc = await EmployeeGeneratedDocument.findOne({
    where: { id: docId, employeeId },
  });
  if (!doc) {
    const err = new Error('Letter not found');
    err.statusCode = 404;
    throw err;
  }
  if (!doc.acknowledgedAt) {
    doc.acknowledgedAt = new Date();
    await doc.save();
  }
  return doc;
}

export async function listGeneratedDocumentsForPortal(employeeId) {
  const docs = await listGeneratedDocuments(employeeId, { limit: 100 });
  return docs.map(formatGeneratedDocumentForPortal);
}

export async function listDocumentVersionHistory(employeeId, code) {
  const normalized = normalizeDocCode(code);
  if (!normalized) return [];

  const docs = await EmployeeGeneratedDocument.findAll({
    where: { employeeId, code: normalized },
    order: [['version', 'DESC']],
  });

  const latestVersion = docs[0]?.version;

  return docs.map((doc) => {
    const plain = doc.get({ plain: true });
    return {
      id: plain.id,
      code: plain.code,
      version: plain.version,
      fileName: plain.fileName,
      createdAt: plain.createdAt,
      isLatest: plain.version === latestVersion,
    };
  });
}
