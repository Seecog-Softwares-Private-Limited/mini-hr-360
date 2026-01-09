#!/usr/bin/env node

/**
 * Helper script to set up the seed.sql file
 * This script will create database/seed.sql with the complete SQL dump
 * 
 * Usage: node setup-seed-file.js
 * 
 * Note: You can also manually copy your SQL dump to database/seed.sql
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED_FILE_PATH = path.join(__dirname, 'database', 'seed.sql');

console.log('📝 Setting up seed.sql file...');
console.log(`📄 Target file: ${SEED_FILE_PATH}`);

// Check if file already exists
if (fs.existsSync(SEED_FILE_PATH)) {
  const stats = fs.statSync(SEED_FILE_PATH);
  console.log(`⚠️  File already exists (${stats.size} bytes)`);
  console.log('💡 If you want to update it, delete the file first or manually edit it.');
  console.log('💡 The seed.sql file should contain your complete SQL dump starting with:');
  console.log('   use mini_hr_360;');
  process.exit(0);
}

// Create a template file with instructions
const template = `-- Database Seed File for mini_hr_360
-- 
-- This file should contain the complete SQL dump for initializing the database.
-- 
-- To set up this file:
-- 1. Copy your complete SQL dump content here
-- 2. Make sure it starts with: use mini_hr_360;
-- 3. Save the file
-- 4. Run: npm run seed-db
--
-- The SQL dump should include:
-- - CREATE TABLE statements for all tables
-- - INSERT statements for seed data
-- - All necessary indexes and foreign keys
--
-- Example structure:
-- use mini_hr_360;
-- DROP TABLE IF EXISTS \`users\`;
-- CREATE TABLE \`users\` (...);
-- INSERT INTO \`users\` VALUES (...);
-- ... (rest of your SQL dump)
`;

fs.writeFileSync(SEED_FILE_PATH, template);
console.log('✅ Created template seed.sql file');
console.log('📝 Please copy your complete SQL dump content to this file');
console.log(`   File location: ${SEED_FILE_PATH}`);
console.log('\n💡 After copying your SQL dump, run: npm run seed-db');



