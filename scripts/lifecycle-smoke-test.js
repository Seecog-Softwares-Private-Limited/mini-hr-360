/**
 * Lifecycle smoke test — schema, seeds, config, optional HTTP.
 * Usage: npm run test:lifecycle
 * Optional: LIFECYCLE_SMOKE_URL=http://localhost:3002 LIFECYCLE_SMOKE_EMAIL=... LIFECYCLE_SMOKE_PASSWORD=...
 */
import dotenv from 'dotenv';
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || './property.env' });

import { sequelize } from '../src/db/index.js';
import DocumentType from '../src/models/DocumentType.js';
import { DOCUMENT_TYPE_SEEDS } from '../src/config/documentTypeTemplates.js';
import { LIFECYCLE_STAGES, WORKFLOW_MATRIX } from '../src/config/lifecycleWorkflows.js';
import { runTestSuite, assert } from './lib/lifecycle-test-utils.js';

const REQUIRED_EMPLOYEE_COLUMNS = [
  'lifecycleStage',
  'offboardingChecklist',
  'fnfSettlement',
  'internStipend',
  'contractEndDate',
  'empIncrementEffectiveDate',
];

const REQUIRED_TABLES = [
  'employees',
  'employee_lifecycle_events',
  'employee_generated_documents',
  'document_types',
  'candidates',
];

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return rows.length > 0;
}

async function tableExists(table) {
  const [rows] = await sequelize.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [table] }
  );
  return rows.length > 0;
}

async function testSchema() {
  for (const table of REQUIRED_TABLES) {
    assert(await tableExists(table), `Missing table: ${table}`);
  }
  for (const col of REQUIRED_EMPLOYEE_COLUMNS) {
    assert(await columnExists('employees', col), `Missing employees.${col}`);
  }
}

async function testDocumentTypes() {
  const count = await DocumentType.count({ where: { isDeleted: false } });
  assert(count >= DOCUMENT_TYPE_SEEDS.length, `Expected ≥${DOCUMENT_TYPE_SEEDS.length} document types, found ${count}`);

  for (const seed of DOCUMENT_TYPE_SEEDS) {
    const row = await DocumentType.findOne({ where: { code: seed.code, isDeleted: false } });
    assert(row, `Missing document type seed: ${seed.code}`);
    assert(row.templateHtml && row.templateHtml.length > 50, `Empty template for ${seed.code}`);
  }
}

function testWorkflowMatrix() {
  const types = ['Permanent', 'Contract', 'Consultant', 'Intern', 'Trainee'];
  for (const type of types) {
    assert(WORKFLOW_MATRIX[type], `Missing workflow matrix for ${type}`);
    for (const stage of LIFECYCLE_STAGES) {
      assert(Array.isArray(WORKFLOW_MATRIX[type][stage]), `${type}.${stage} must be an array`);
    }
  }
}

async function testOptionalHttp() {
  const base = process.env.LIFECYCLE_SMOKE_URL;
  const email = process.env.LIFECYCLE_SMOKE_EMAIL;
  const password = process.env.LIFECYCLE_SMOKE_PASSWORD;
  if (!base) {
    console.log('  ℹ️ Skipping HTTP checks (set LIFECYCLE_SMOKE_URL to enable)');
    return;
  }

  const loginRes = await fetch(`${base.replace(/\/$/, '')}/api/v1/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert(loginRes.ok, `Login failed: HTTP ${loginRes.status}`);

  const loginBody = await loginRes.json();
  const token = loginBody?.data?.accessToken || loginBody?.accessToken;
  assert(token, 'Login response missing access token');

  const alertsRes = await fetch(`${base.replace(/\/$/, '')}/api/v1/lifecycle/alerts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(alertsRes.ok, `Lifecycle alerts endpoint failed: HTTP ${alertsRes.status}`);
}

const main = async () => {
  console.log('Lifecycle smoke test\n');
  await sequelize.authenticate();
  console.log(`Connected: ${sequelize.getDatabaseName()}`);

  const suites = [
    ['Schema & tables', testSchema],
    ['Document type seeds', testDocumentTypes],
    ['Workflow matrix config', testWorkflowMatrix],
    ['HTTP API (optional)', testOptionalHttp],
  ];

  let totalPassed = 0;
  let totalFailed = 0;

  for (const [name, fn] of suites) {
    const { passed, failed } = await runTestSuite(name, [[name, fn]]);
    totalPassed += passed;
    totalFailed += failed;
  }

  await sequelize.close();
  console.log(`\nResult: ${totalPassed} passed, ${totalFailed} failed`);
  process.exit(totalFailed > 0 ? 1 : 0);
};

main().catch(async (err) => {
  console.error('Smoke test error:', err.message || err);
  try {
    await sequelize.close();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
