/**
 * Backfill lifecycleStage for existing employees (dry-run by default).
 *
 * Usage:
 *   npm run lifecycle:backfill              # preview changes
 *   npm run lifecycle:backfill -- --apply   # write to DB
 *   npm run lifecycle:backfill -- --force   # re-infer even if stage ≠ prospect
 */
import dotenv from 'dotenv';
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || './property.env' });

import { sequelize } from '../src/db/index.js';
import Employee from '../src/models/Employee.js';
import EmployeeGeneratedDocument from '../src/models/EmployeeGeneratedDocument.js';
import EmployeeLifecycleEvent from '../src/models/EmployeeLifecycleEvent.js';
import { normalizeDocCode } from '../src/config/lifecycleWorkflows.js';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const FORCE = args.includes('--force');

const EXIT_DOC_CODES = new Set([
  'RESIGNATION_ACCEPTANCE',
  'NO_DUES_CLEARANCE',
  'FULL_FINAL_STATEMENT',
  'RELIEVING_LETTER',
]);

function inferStage(employee, docCodes) {
  const current = employee.lifecycleStage || 'prospect';
  if (current !== 'prospect' && !FORCE) return null;

  const codes = new Set(docCodes.map(normalizeDocCode));

  if (codes.has('RELIEVING_LETTER') || employee.exitStatus === 'completed') {
    return 'exited';
  }

  if (
    employee.exitStatus === 'in_progress' ||
    employee.resignationDate ||
    [...codes].some((c) => EXIT_DOC_CODES.has(c))
  ) {
    return 'offboarding';
  }

  if (codes.has('PROBATION_LETTER')) {
    if (employee.employmentStatus === 'Confirmed') {
      return 'confirmed';
    }
    return 'active';
  }

  if (codes.has('PRE_PLACEMENT_OFFER')) return 'joining';

  if (codes.has('OFFER_LETTER') || codes.has('INTERNSHIP_OFFER')) return 'offer';

  if (employee.empDateOfJoining) {
    const doj = new Date(employee.empDateOfJoining);
    if (!Number.isNaN(doj.getTime()) && doj <= new Date()) {
      if (employee.employmentStatus === 'Confirmed') {
        return 'confirmed';
      }
      return 'active';
    }
  }

  if (!employee.isActive && employee.employmentStatus && employee.employmentStatus !== 'Active') {
    return 'exited';
  }

  return 'prospect';
}

async function loadDocCodesByEmployee() {
  const rows = await EmployeeGeneratedDocument.findAll({
    attributes: ['employeeId', 'code'],
  });

  const map = new Map();
  for (const row of rows) {
    const code = normalizeDocCode(row.code);
    if (!code) continue;
    const list = map.get(row.employeeId) || [];
    list.push(code);
    map.set(row.employeeId, list);
  }
  return map;
}

const main = async () => {
  await sequelize.authenticate();
  console.log(`Lifecycle stage backfill (${APPLY ? 'APPLY' : 'DRY-RUN'}${FORCE ? ', force' : ''})\n`);

  const docMap = await loadDocCodesByEmployee();
  const employees = await Employee.findAll({
    attributes: [
      'id',
      'empId',
      'empName',
      'lifecycleStage',
      'employeeType',
      'empDateOfJoining',
      'employmentStatus',
      'isActive',
      'resignationDate',
      'exitStatus',
    ],
    order: [['id', 'ASC']],
  });

  let updated = 0;
  let skipped = 0;

  for (const emp of employees) {
    const docCodes = docMap.get(emp.id) || [];
    const inferred = inferStage(emp, docCodes);
    if (!inferred) {
      skipped++;
      continue;
    }

    const from = emp.lifecycleStage || 'prospect';
    if (from === inferred) {
      skipped++;
      continue;
    }

    console.log(
      `  ${emp.empId || emp.id} ${emp.empName}: ${from} → ${inferred}` +
        (docCodes.length ? ` (docs: ${[...new Set(docCodes)].join(', ')})` : '')
    );

    if (APPLY) {
      await emp.update({ lifecycleStage: inferred });
      await EmployeeLifecycleEvent.create({
        employeeId: emp.id,
        fromStage: from,
        toStage: inferred,
        action: 'backfill_lifecycle_stage',
        actorUserId: null,
        payload: { docCodes: [...new Set(docCodes)] },
      });
    }
    updated++;
  }

  console.log(`\n${APPLY ? 'Updated' : 'Would update'}: ${updated}, skipped: ${skipped}`);
  if (!APPLY && updated > 0) {
    console.log('Run with --apply to persist changes.');
  }

  await sequelize.close();
  process.exit(0);
};

main().catch(async (err) => {
  console.error('Backfill failed:', err.message || err);
  try {
    await sequelize.close();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
