/**
 * Migration: Add missing password column to employees table
 * 
 * This script adds the password column that is defined in the Employee model
 * but missing from the database table.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../property.env') });

// Import database connection
const { sequelize } = await import('../../src/db/index.js');

async function runMigration() {
  try {
    console.log('🔄 Starting migration: Add password column to employees table...\n');

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const queryInterface = sequelize.getQueryInterface();
    const tableDescription = await queryInterface.describeTable('employees');
    
    const columnsToAdd = [
      {
        name: 'password',
        sql: `ALTER TABLE \`employees\` ADD COLUMN \`password\` VARCHAR(255) NULL COMMENT 'Hashed password for employee portal login' AFTER \`systemRole\``,
        after: 'systemRole',
      },
      {
        name: 'role',
        sql: `ALTER TABLE \`employees\` ADD COLUMN \`role\` ENUM('EMPLOYEE', 'MANAGER', 'HR') NOT NULL DEFAULT 'EMPLOYEE' COMMENT 'Role within employee portal' AFTER \`password\``,
        after: 'password',
      },
      {
        name: 'canLogin',
        sql: `ALTER TABLE \`employees\` ADD COLUMN \`canLogin\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether employee can login to portal' AFTER \`role\``,
        after: 'role',
      },
      {
        name: 'lastEmployeeLoginAt',
        sql: `ALTER TABLE \`employees\` ADD COLUMN \`lastEmployeeLoginAt\` DATETIME NULL AFTER \`canLogin\``,
        after: 'canLogin',
      },
      {
        name: 'employeeRefreshToken',
        sql: `ALTER TABLE \`employees\` ADD COLUMN \`employeeRefreshToken\` TEXT NULL AFTER \`lastEmployeeLoginAt\``,
        after: 'lastEmployeeLoginAt',
      },
      {
        name: 'employeeRefreshTokenExpiresAt',
        sql: `ALTER TABLE \`employees\` ADD COLUMN \`employeeRefreshTokenExpiresAt\` DATETIME NULL AFTER \`employeeRefreshToken\``,
        after: 'employeeRefreshToken',
      },
      {
        name: 'businessId',
        sql: `ALTER TABLE \`employees\` ADD COLUMN \`businessId\` INT NULL COMMENT 'Business this employee belongs to (for multi-tenancy)' AFTER \`employeeRefreshTokenExpiresAt\``,
        after: 'employeeRefreshTokenExpiresAt',
      },
    ];

    let addedCount = 0;
    let skippedCount = 0;

    for (const column of columnsToAdd) {
      if (tableDescription[column.name]) {
        console.log(`⏭️  Column '${column.name}' already exists, skipping...`);
        skippedCount++;
      } else {
        console.log(`➕ Adding column '${column.name}'...`);
        await sequelize.query(column.sql);
        console.log(`✅ Column '${column.name}' added successfully`);
        addedCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Added: ${addedCount} columns`);
    console.log(`   ⏭️  Skipped: ${skippedCount} columns (already exist)`);
    console.log(`\n✅ Migration completed successfully!`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.parent) {
      console.error('   SQL Error:', error.parent.sqlMessage);
      console.error('   SQL:', error.parent.sql);
    }
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Database connection closed');
  }
}

runMigration();
