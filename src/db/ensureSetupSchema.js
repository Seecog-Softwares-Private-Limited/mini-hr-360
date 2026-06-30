import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const migration = require('../../database/migrations/add-organization-setup-wizard.cjs');

let ensured = false;

export async function ensureSetupSchema(sequelize) {
  if (ensured) return;
  try {
    const qi = sequelize.getQueryInterface();
    await migration.up(qi, sequelize.Sequelize);
    ensured = true;
    console.log('✅ Organization setup schema ensured');
  } catch (err) {
    console.warn('⚠️ ensureSetupSchema:', err?.message || err);
  }
}
