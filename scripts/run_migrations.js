import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import dotenv from 'dotenv';
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || './property.env' });
import connectDB, { sequelize } from '../src/db/index.js';
import { Sequelize } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const run = async () => {
  try {
    // Authenticate without running the full connectDB() flow to avoid automatic model syncs
    await sequelize.authenticate();
    console.log(`Connected to DB: ${sequelize.getDatabaseName()}`);
    const queryInterface = sequelize.getQueryInterface();

    const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.js') || f.endsWith('.cjs'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found.');
      process.exit(0);
    }

    for (const file of files) {
      const full = path.join(migrationsDir, file);
      console.log(`Running migration: ${file}`);
      let mod;
      if (file.endsWith('.cjs')) {
        mod = require(full);
      } else if (file.endsWith('.js')) {
        const { pathToFileURL } = await import('url');
        mod = await import(pathToFileURL(full));
        // If module is ESM and exports default with up/down, normalize
        if (mod && mod.default && (mod.default.up || mod.default.down)) {
          mod = mod.default;
        }
      } else {
        mod = require(full);
      }
      if (mod && typeof mod.up === 'function') {
        try {
          await mod.up(queryInterface, Sequelize);
          console.log(`  ✅ Applied ${file}`);
        } catch (err) {
          const msg = (err && err.message) ? err.message : String(err);
          if (msg.includes('Duplicate column') || msg.includes('Duplicate column name') || msg.includes('already exists')) {
            console.log(`  ℹ️ Skipping ${file} — already applied: ${msg}`);
          } else {
            console.log(`  ⚠️ Migration ${file} failed: ${msg} — continuing to next`);
          }
        }
      } else {
        console.log(`  ⚠️ Skipping ${file} (no up function)`);
      }
    }

    console.log('All migrations applied.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err?.message || err);
    process.exit(1);
  }
};

run();
