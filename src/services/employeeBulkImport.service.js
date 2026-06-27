import { Op } from 'sequelize';
import Employee from '../models/Employee.js';
import EmployeeLifecycleEvent from '../models/EmployeeLifecycleEvent.js';
import { LIFECYCLE_STAGES } from '../config/lifecycleWorkflows.js';
import { generatePassword } from '../utils/passwordGenerator.js';

const EMPLOYEE_TYPES = new Set(['Permanent', 'Contract', 'Intern', 'Consultant', 'Trainee']);

const CSV_HEADERS = [
  'firstName',
  'lastName',
  'empEmail',
  'empPhone',
  'employeeType',
  'lifecycleStage',
  'empDesignation',
  'empDepartment',
  'empWorkLoc',
  'empCtc',
  'empDateOfJoining',
  'contractEndDate',
  'internStipend',
];

export function getBulkImportCsvTemplate() {
  return `${CSV_HEADERS.join(',')}\nAsha,Sharma,asha@example.com,9876543210,Permanent,active,Software Engineer,Engineering,Mumbai,720000,2024-04-01,,\n`;
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseEmployeeCsv(csvText) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  if (lines.length < 2) {
    const err = new Error('CSV must include a header row and at least one data row');
    err.statusCode = 400;
    throw err;
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = { _line: i + 1 };
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    rows.push(row);
  }

  return rows;
}

function normalizeType(value) {
  const v = String(value || 'Permanent').trim();
  return EMPLOYEE_TYPES.has(v) ? v : 'Permanent';
}

function normalizeStage(value) {
  const v = String(value || 'prospect').trim().toLowerCase();
  return LIFECYCLE_STAGES.includes(v) ? v : 'prospect';
}

function validateRow(row) {
  const errors = [];
  if (!row.firstname && !row.firstName) errors.push('firstName required');
  if (!row.lastname && !row.lastName) errors.push('lastName required');
  const type = normalizeType(row.employeetype || row.employeeType);
  if ((type === 'Contract' || type === 'Consultant') && !(row.contractenddate || row.contractEndDate)) {
    errors.push('contractEndDate required for Contract/Consultant');
  }
  const stage = normalizeStage(row.lifecyclestage || row.lifecycleStage);
  if (stage === 'exited' || stage === 'offboarding') {
    errors.push(`lifecycleStage "${stage}" not allowed on import — use HR exit workflow`);
  }
  return errors;
}

/**
 * Import employees from parsed CSV rows.
 */
export async function bulkImportEmployees({
  rows,
  businessId,
  userId,
  defaultReportingManagerId,
  actorUserId,
}) {
  if (!defaultReportingManagerId) {
    const err = new Error('defaultReportingManagerId is required');
    err.statusCode = 400;
    throw err;
  }

  const manager = await Employee.findOne({
    where: { id: Number(defaultReportingManagerId), businessId: Number(businessId), isActive: true },
    attributes: ['id'],
  });
  if (!manager) {
    const err = new Error('Default reporting manager not found in this organization');
    err.statusCode = 400;
    throw err;
  }

  const results = { created: [], skipped: [], errors: [] };

  for (const raw of rows) {
    const line = raw._line;
    const fieldErrors = validateRow(raw);
    if (fieldErrors.length) {
      results.errors.push({ line, message: fieldErrors.join('; ') });
      continue;
    }

    const firstName = String(raw.firstname || raw.firstName || '').trim();
    const lastName = String(raw.lastname || raw.lastName || '').trim();
    const empEmail = String(raw.empemail || raw.empEmail || '').trim().toLowerCase();
    const empPhone = String(raw.empphone || raw.empPhone || '').replace(/\D/g, '').slice(-10) || '0000000000';
    const employeeType = normalizeType(raw.employeetype || raw.employeeType);
    const lifecycleStage = normalizeStage(raw.lifecyclestage || raw.lifecycleStage);

    if (!empEmail) {
      results.errors.push({ line, message: 'empEmail required' });
      continue;
    }

    const existing = await Employee.findOne({
      where: { businessId: Number(businessId), empEmail },
      attributes: ['id', 'empId', 'empName'],
    });
    if (existing) {
      results.skipped.push({
        line,
        empEmail,
        reason: `Already exists: ${existing.empName} (${existing.empId})`,
      });
      continue;
    }

    const password = generatePassword(12);
    const empCtc = Number(raw.empctc || raw.empCtc || 0) || 0;
    const internStipendRaw = raw.internstipend ?? raw.internStipend;
    const internStipend = internStipendRaw === '' || internStipendRaw == null ? null : Number(internStipendRaw);

    try {
      const employee = await Employee.create({
        userId,
        businessId: Number(businessId),
        firstName,
        lastName,
        empName: `${firstName} ${lastName}`.trim(),
        empEmail,
        empPhone,
        empDesignation: String(raw.empdesignation || raw.empDesignation || 'Unassigned').trim(),
        empDepartment: String(raw.empdepartment || raw.empDepartment || 'General').trim(),
        empWorkLoc: String(raw.empworkloc || raw.empWorkLoc || 'Unassigned').trim(),
        employeeType,
        lifecycleStage,
        empCtc,
        empDateOfJoining: raw.empdateofjoining || raw.empDateOfJoining || null,
        contractEndDate: raw.contractenddate || raw.contractEndDate || null,
        internStipend,
        reportingManagerId: manager.id,
        employmentStatus: 'Active',
        empDob: '1990-01-01',
        password,
        canLogin: false,
        forcePasswordReset: true,
      });

      await EmployeeLifecycleEvent.create({
        employeeId: employee.id,
        fromStage: 'prospect',
        toStage: lifecycleStage,
        action: 'bulk_import',
        actorUserId: actorUserId || null,
        payload: { line, employeeType },
      });

      results.created.push({
        line,
        id: employee.id,
        empId: employee.empId,
        empName: employee.empName,
        empEmail,
        lifecycleStage,
        employeeType,
      });
    } catch (err) {
      results.errors.push({ line, message: err.message || 'Create failed' });
    }
  }

  return results;
}

export async function listManagersForImport(businessId) {
  return Employee.findAll({
    where: { businessId: Number(businessId), isActive: true },
    attributes: ['id', 'empId', 'empName', 'empDesignation'],
    order: [['empName', 'ASC']],
    limit: 200,
  });
}
