import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DocumentApprovalRequest from '../models/DocumentApprovalRequest.js';
import Employee from '../models/Employee.js';
import DocumentType from '../models/DocumentType.js';
import { requiresDocumentApproval } from '../config/documentApproval.js';
import { normalizeDocCode } from '../config/lifecycleWorkflows.js';
import { finalizeDocumentDelivery } from './documentDelivery.service.js';
import { loadEmployeeForLifecycle } from './employeeLifecycle.service.js';
import { notifyOfferPendingApproval } from './lifecycleNotification.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PENDING_DIR = path.join(__dirname, '..', '..', 'storage', 'pending-approvals');

function ensurePendingDir() {
  if (!fs.existsSync(PENDING_DIR)) {
    fs.mkdirSync(PENDING_DIR, { recursive: true });
  }
}

export function shouldQueueForApproval(code, skipApproval) {
  if (skipApproval === true || skipApproval === 'true' || skipApproval === '1') {
    return false;
  }
  return requiresDocumentApproval(code);
}

export async function queueDocumentApproval({
  businessId,
  employeeId,
  documentTypeId,
  code,
  pdfBuffer,
  fileName,
  requestedByUserId,
  metadata = {},
}) {
  ensurePendingDir();
  const stamp = Date.now();
  const safeName = `${stamp}-${employeeId}-${normalizeDocCode(code)}.pdf`;
  const filePath = path.join(PENDING_DIR, safeName);
  fs.writeFileSync(filePath, pdfBuffer);

  const request = await DocumentApprovalRequest.create({
    businessId,
    employeeId,
    documentTypeId,
    code: normalizeDocCode(code),
    fileName,
    filePath,
    status: 'pending',
    requestedByUserId,
    metadata,
  });

  const employee = await Employee.findByPk(employeeId, { attributes: ['empName'] });
  notifyOfferPendingApproval({
    businessId,
    employeeName: employee?.empName || metadata.employeeName || 'Employee',
    approvalRequestId: request.id,
  }).catch(() => {});

  return request;
}

export async function listPendingApprovals(businessId, { status = 'pending' } = {}) {
  const where = { businessId };
  if (status) where.status = status;

  return DocumentApprovalRequest.findAll({
    where,
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['id', 'empName', 'empId', 'empEmail', 'employeeType', 'lifecycleStage'],
      },
      {
        model: DocumentType,
        as: 'documentType',
        attributes: ['id', 'name', 'code'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });
}

export async function getApprovalRequest(id, businessId) {
  return DocumentApprovalRequest.findOne({
    where: { id, businessId },
    include: [
      { model: Employee, as: 'employee' },
      { model: DocumentType, as: 'documentType' },
    ],
  });
}

export async function approveDocumentRequest(id, businessId, { reviewedByUserId, reviewNote } = {}) {
  const request = await getApprovalRequest(id, businessId);
  if (!request) {
    const err = new Error('Approval request not found');
    err.statusCode = 404;
    throw err;
  }
  if (request.status !== 'pending') {
    const err = new Error(`Request already ${request.status}`);
    err.statusCode = 400;
    throw err;
  }

  if (!fs.existsSync(request.filePath)) {
    const err = new Error('Pending PDF file not found on disk');
    err.statusCode = 410;
    throw err;
  }

  const pdfBuffer = fs.readFileSync(request.filePath);
  const employee = await loadEmployeeForLifecycle(request.employeeId);
  const docType =
    request.documentType ||
    (await DocumentType.findByPk(request.documentTypeId));

  const meta = request.metadata || {};
  const result = await finalizeDocumentDelivery({
    employee,
    docType,
    code: request.code,
    pdfBuffer,
    fileName: request.fileName,
    templateData: meta.templateData || {},
    actorUserId: reviewedByUserId,
    postGenerateMeta: meta.postGenerateMeta || {},
  });

  request.status = 'approved';
  request.reviewedByUserId = reviewedByUserId;
  request.reviewNote = reviewNote || null;
  await request.save();

  try {
    fs.unlinkSync(request.filePath);
  } catch {
    /* ignore cleanup errors */
  }

  return { request, ...result };
}

export async function rejectDocumentRequest(id, businessId, { reviewedByUserId, reviewNote } = {}) {
  const request = await getApprovalRequest(id, businessId);
  if (!request) {
    const err = new Error('Approval request not found');
    err.statusCode = 404;
    throw err;
  }
  if (request.status !== 'pending') {
    const err = new Error(`Request already ${request.status}`);
    err.statusCode = 400;
    throw err;
  }

  request.status = 'rejected';
  request.reviewedByUserId = reviewedByUserId;
  request.reviewNote = reviewNote || null;
  await request.save();

  try {
    if (fs.existsSync(request.filePath)) fs.unlinkSync(request.filePath);
  } catch {
    /* ignore */
  }

  return request;
}

export function readPendingPdf(request) {
  if (!request?.filePath || !fs.existsSync(request.filePath)) return null;
  return fs.readFileSync(request.filePath);
}
