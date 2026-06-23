import path from 'path';
import fs from 'fs';
import { Op } from 'sequelize';
import { EmployeeDocument } from '../models/index.js';

export const DOCUMENT_CATEGORIES = [
  { key: 'ALL', label: 'All Documents', icon: 'fa-folder-open', color: '#6366f1' },
  { key: 'KYC', label: 'KYC', icon: 'fa-id-card', color: '#0ea5e9' },
  { key: 'PAN', label: 'PAN', icon: 'fa-credit-card', color: '#8b5cf6' },
  { key: 'AADHAAAR', label: 'Aadhaar', icon: 'fa-fingerprint', color: '#06b6d4' },
  { key: 'ADDRESS', label: 'Address Proof', icon: 'fa-house', color: '#f59e0b' },
  { key: 'EDUCATION', label: 'Education', icon: 'fa-graduation-cap', color: '#22c55e' },
  { key: 'EXPERIENCE', label: 'Experience', icon: 'fa-briefcase', color: '#3b82f6' },
  { key: 'HR', label: 'HR Letters', icon: 'fa-file-contract', color: '#ec4899' },
  { key: 'OTHER', label: 'Other', icon: 'fa-file', color: '#64748b' },
];

const EXPIRY_WARNING_DAYS = 30;

export function getCategoryMeta(category) {
  return DOCUMENT_CATEGORIES.find((c) => c.key === category) || DOCUMENT_CATEGORIES[DOCUMENT_CATEGORIES.length - 1];
}

export function getExpiryInfo(expiryDate) {
  if (!expiryDate) {
    return { status: 'none', label: null, daysUntil: null, isExpired: false, isExpiringSoon: false };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${String(expiryDate).split('T')[0]}T12:00:00`);
  const daysUntil = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) {
    return {
      status: 'expired',
      label: `Expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} ago`,
      daysUntil,
      isExpired: true,
      isExpiringSoon: false,
    };
  }

  if (daysUntil <= EXPIRY_WARNING_DAYS) {
    return {
      status: 'expiring',
      label: daysUntil === 0 ? 'Expires today' : `Expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
      daysUntil,
      isExpired: false,
      isExpiringSoon: true,
    };
  }

  return {
    status: 'valid',
    label: `Valid until ${expiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    daysUntil,
    isExpired: false,
    isExpiringSoon: false,
  };
}

function pickFileSource(doc) {
  return doc.fileUrl || doc.documentImageUrl || null;
}

export function resolveDocumentFile(source) {
  if (!source) return null;

  if (/^https?:\/\//i.test(source)) {
    return { type: 'external', url: source };
  }

  const cleaned = source.replace(/^\//, '');
  const candidates = [
    path.join(process.cwd(), cleaned),
    path.join(process.cwd(), 'public', cleaned),
    path.join(process.cwd(), 'storage', cleaned),
    path.join(process.cwd(), 'GeneratedPdf', cleaned),
  ];

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return { type: 'local', path: filePath };
      }
    } catch {
      /* skip */
    }
  }

  return null;
}

export function mimeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return map[ext] || 'application/octet-stream';
}

export function isPreviewableMime(mime) {
  return mime === 'application/pdf' || (mime && mime.startsWith('image/'));
}

export function formatDocumentForVault(doc, employeeId) {
  const plain = doc.get ? doc.get({ plain: true }) : doc;
  const categoryMeta = getCategoryMeta(plain.category);
  const expiry = getExpiryInfo(plain.expiryDate);
  const fileSource = pickFileSource(plain);
  const hasFile = Boolean(fileSource);
  const resolved = hasFile ? resolveDocumentFile(fileSource) : null;

  let previewType = 'none';
  if (resolved?.type === 'local') {
    const mime = mimeFromPath(resolved.path);
    if (mime === 'application/pdf') previewType = 'pdf';
    else if (mime.startsWith('image/')) previewType = 'image';
    else previewType = 'download';
  } else if (resolved?.type === 'external') {
    previewType = 'external';
  }

  return {
    id: plain.id,
    category: plain.category,
    categoryLabel: categoryMeta.label,
    categoryIcon: categoryMeta.icon,
    categoryColor: categoryMeta.color,
    documentType: plain.documentType,
    nameOnDocument: plain.nameOnDocument,
    documentNumber: plain.documentNumber,
    issueDate: plain.issueDate,
    expiryDate: plain.expiryDate,
    expiry,
    verificationStatus: plain.verificationStatus,
    notes: plain.notes,
    hasFile,
    previewType,
    previewUrl: hasFile ? `/employee/documents/${plain.id}/preview` : null,
    downloadUrl: hasFile ? `/employee/documents/${plain.id}/download` : null,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

export async function listEmployeeDocuments(employeeId, { category = null } = {}) {
  const where = { employeeId };
  if (category && category !== 'ALL') {
    where.category = category;
  }

  const rows = await EmployeeDocument.findAll({
    where,
    order: [
      ['expiryDate', 'ASC'],
      ['updatedAt', 'DESC'],
    ],
  });

  return rows.map((row) => formatDocumentForVault(row, employeeId));
}

export async function getEmployeeDocumentForAccess(employeeId, documentId) {
  const doc = await EmployeeDocument.findOne({
    where: { id: documentId, employeeId },
  });
  if (!doc) return null;
  return doc;
}

export async function getExpiryReminders(employeeId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const warningEnd = new Date(today);
  warningEnd.setDate(warningEnd.getDate() + EXPIRY_WARNING_DAYS);

  const rows = await EmployeeDocument.findAll({
    where: {
      employeeId,
      expiryDate: { [Op.ne]: null },
    },
    order: [['expiryDate', 'ASC']],
  });

  return rows
    .map((row) => formatDocumentForVault(row, employeeId))
    .filter((d) => d.expiry.isExpired || d.expiry.isExpiringSoon);
}

export function getVaultSummary(documents) {
  const byCategory = {};
  DOCUMENT_CATEGORIES.forEach((c) => {
    if (c.key !== 'ALL') byCategory[c.key] = 0;
  });

  documents.forEach((d) => {
    if (byCategory[d.category] !== undefined) byCategory[d.category] += 1;
  });

  const expiring = documents.filter((d) => d.expiry.isExpiringSoon).length;
  const expired = documents.filter((d) => d.expiry.isExpired).length;
  const verified = documents.filter((d) => d.verificationStatus === 'Verified').length;

  return {
    total: documents.length,
    byCategory,
    expiring,
    expired,
    verified,
  };
}
