import dotenv from 'dotenv';
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || './property.env' });
import { sequelize } from '../src/db/index.js';
import { QueryTypes } from 'sequelize';

const run = async () => {
  try {
    await sequelize.authenticate();
    const dbName = sequelize.getDatabaseName();
    const rows = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      { replacements: [dbName, 'payroll_settings'], type: QueryTypes.SELECT }
    );
    console.log('Columns in payroll_settings:');
    rows.forEach(r => console.log(' -', r.COLUMN_NAME));
    process.exit(0);
  } catch (err) {
    console.error('Error checking columns:', err?.message || err);
    process.exit(1);
  }
};

run();
