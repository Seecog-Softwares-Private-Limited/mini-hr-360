import dotenv from 'dotenv';
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || './property.env' });
import { sequelize } from '../src/db/index.js';
import { Sequelize } from 'sequelize';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const run = async () => {
  try {
    await sequelize.authenticate();
    const mig = require(path.join('..', 'database', 'migrations', 'add-proration-finyear-to-payroll.cjs'));
    if (mig && typeof mig.up === 'function') {
      await mig.up(sequelize.getQueryInterface(), Sequelize);
      console.log('✅ Applied add-proration-finyear-to-payroll.cjs');
    } else {
      console.log('Migration not found or invalid');
    }
    process.exit(0);
  } catch (err) {
    console.error('Failed to apply migration:', err?.message || err);
    process.exit(1);
  }
};

run();
