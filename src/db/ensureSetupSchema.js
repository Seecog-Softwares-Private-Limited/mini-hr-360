import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const setupMigration = require('../../database/migrations/add-organization-setup-wizard.cjs');
const employeeAssetsMigration = require('../../database/migrations/create-employee-assets.cjs');

let ensured = false;

export async function ensureSetupSchema(sequelize) {
  if (ensured) return;
  try {
    const qi = sequelize.getQueryInterface();
    await setupMigration.up(qi, sequelize.Sequelize);
    await employeeAssetsMigration.up(qi, sequelize.Sequelize);
    ensured = true;
    console.log('✅ Organization setup schema ensured');
  } catch (err) {
    console.warn('⚠️ ensureSetupSchema:', err?.message || err);
  }
}
