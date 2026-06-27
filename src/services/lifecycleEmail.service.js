import EmailTemplate from '../models/EmailTemplate.js';
import { normalizeDocCode } from '../config/lifecycleWorkflows.js';
import { getDefaultEmailTemplateForCode } from '../config/lifecycleEmailTemplates.js';

function interpolate(template, vars) {
  if (!template) return '';
  return String(template).replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key];
    return val === undefined || val === null ? '' : String(val);
  });
}

function buildTemplateVars({ employee, docType, code, templateData = {} }) {
  const companyName = process.env.COMPANY_NAME || 'Seecog Softwares Pvt. Ltd.';
  const docLabel = docType?.name || docType?.code || code || 'Document';
  const formatCtc = (n) => {
    const num = Number(n);
    if (!num) return '—';
    return `₹${num.toLocaleString('en-IN')}`;
  };

  return {
    EMP_NAME: employee.empName || 'Employee',
    COMPANY_NAME: companyName,
    DOC_LABEL: docLabel,
    DOC_CODE: normalizeDocCode(code),
    DESIGNATION: employee.empDesignation || templateData.DESIGNATION || '—',
    DEPARTMENT: employee.empDepartment || '—',
    JOINING_DATE: employee.empDateOfJoining || templateData.JOINING_DATE || '—',
    CTC: formatCtc(employee.empCtc || templateData.CTC),
    EFFECTIVE_DATE:
      employee.empIncrementEffectiveDate ||
      templateData.EFFECTIVE_DATE ||
      new Date().toISOString().slice(0, 10),
    LAST_WORKING_DAY: employee.lastWorkingDay || templateData.LAST_WORKING_DAY || '—',
    MONTH_YEAR:
      templateData.EMAIL_MONTH_YEAR ||
      templateData.Month ||
      templateData.MONTH_YEAR ||
      'this month',
  };
}

async function resolveTemplateFromDb(documentTypeId) {
  if (!documentTypeId) return null;
  const row = await EmailTemplate.findOne({
    where: { documentTypeId, isDefault: true, deleted: false },
    attributes: ['subject', 'bodyHtml'],
  });
  if (!row) return null;
  return { subject: row.subject, bodyHtml: row.bodyHtml };
}

/**
 * Build subject + HTML for lifecycle document emails.
 * Uses DB default template for document type when set; otherwise config defaults.
 */
export async function buildLifecycleDocumentEmail({
  employee,
  docType,
  code,
  templateData = {},
}) {
  const normalized = normalizeDocCode(code);
  const fromDb = await resolveTemplateFromDb(docType?.id);
  const defaults = getDefaultEmailTemplateForCode(normalized);
  const template = fromDb || defaults;
  const vars = buildTemplateVars({ employee, docType, code: normalized, templateData });

  return {
    subject: interpolate(template.subject, vars),
    html: interpolate(template.bodyHtml, vars),
    templateSource: fromDb ? 'database' : 'config',
    code: normalized,
  };
}

/**
 * HR digest email for scheduled lifecycle alerts.
 */
export function buildLifecycleDigestEmail({ businessName, items }) {
  const companyName = businessName || process.env.COMPANY_NAME || 'Your organization';
  const baseUrl = (process.env.APP_BASE_URL || '').replace(/\/$/, '');
  const rows = (items || [])
    .map((item) => {
      const href = item.link ? `${baseUrl}${item.link}` : '';
      const linkHtml = href ? ` <a href="${href}">View in HR portal</a>` : '';
      return `<li style="margin-bottom:8px;"><strong>${item.title}</strong><br/><span style="color:#555;">${item.message}</span>${linkHtml}</li>`;
    })
    .join('');

  return {
    subject: `HR Lifecycle digest — ${companyName} (${items.length} item${items.length === 1 ? '' : 's'})`,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;">
      <p>Daily lifecycle summary for <strong>${companyName}</strong>:</p>
      <ul>${rows}</ul>
      <p style="color:#666;font-size:12px;">This is an automated digest from MINI-HR-360.</p>
    </div>`,
  };
}
