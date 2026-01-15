/**
 * Migration: Add missing columns to leave_types table
 * 
 * This script adds the missing columns that are defined in the LeaveType model
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
    console.log('🔄 Starting migration: Add missing columns to leave_types table...\n');

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const queryInterface = sequelize.getQueryInterface();
    const tableDescription = await queryInterface.describeTable('leave_types');
    
    const columnsToAdd = [
      {
        name: 'isPaid',
        definition: {
          type: 'BOOLEAN',
          allowNull: false,
          defaultValue: true,
          comment: 'Whether this leave type is paid',
        },
        after: 'status',
      },
      {
        name: 'allowHalfDay',
        definition: {
          type: 'BOOLEAN',
          allowNull: false,
          defaultValue: true,
          comment: 'Whether half-day leave is allowed',
        },
        after: 'isPaid',
      },
      {
        name: 'maxPerYear',
        definition: {
          type: 'DECIMAL(5, 2)',
          allowNull: true,
          comment: 'Maximum leaves allowed per year (null = unlimited)',
        },
        after: 'allowHalfDay',
      },
      {
        name: 'allowCarryForward',
        definition: {
          type: 'BOOLEAN',
          allowNull: false,
          defaultValue: false,
          comment: 'Whether unused leaves can be carried forward',
        },
        after: 'maxPerYear',
      },
      {
        name: 'maxCarryForward',
        definition: {
          type: 'DECIMAL(5, 2)',
          allowNull: true,
          comment: 'Maximum leaves that can be carried forward',
        },
        after: 'allowCarryForward',
      },
      {
        name: 'requiresAttachment',
        definition: {
          type: 'BOOLEAN',
          allowNull: false,
          defaultValue: false,
          comment: 'Whether attachment is required for this leave type',
        },
        after: 'maxCarryForward',
      },
      {
        name: 'minDaysNotice',
        definition: {
          type: 'INTEGER',
          allowNull: true,
          defaultValue: 0,
          comment: 'Minimum days notice required for applying',
        },
        after: 'requiresAttachment',
      },
      {
        name: 'color',
        definition: {
          type: 'VARCHAR(20)',
          allowNull: true,
          defaultValue: '#6366f1',
          comment: 'Color code for UI display',
        },
        after: 'minDaysNotice',
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
        
        let sql = '';
        const afterClause = column.after ? `AFTER \`${column.after}\`` : '';
        
        if (column.definition.type === 'BOOLEAN') {
          const nullable = column.definition.allowNull ? 'NULL' : 'NOT NULL';
          const defaultValue = column.definition.defaultValue !== undefined 
            ? `DEFAULT ${column.definition.defaultValue ? 1 : 0}` 
            : '';
          const comment = column.definition.comment 
            ? `COMMENT '${column.definition.comment.replace(/'/g, "\\'")}'` 
            : '';
          
          sql = `ALTER TABLE \`leave_types\` ADD COLUMN \`${column.name}\` TINYINT(1) ${nullable} ${defaultValue} ${comment} ${afterClause}`;
        } else if (column.definition.type.includes('DECIMAL')) {
          const match = column.definition.type.match(/DECIMAL\((\d+),\s*(\d+)\)/);
          const precision = match ? match[1] : '5';
          const scale = match ? match[2] : '2';
          const nullable = column.definition.allowNull ? 'NULL' : 'NOT NULL';
          const defaultValue = column.definition.defaultValue !== undefined 
            ? `DEFAULT ${column.definition.defaultValue}` 
            : '';
          const comment = column.definition.comment 
            ? `COMMENT '${column.definition.comment.replace(/'/g, "\\'")}'` 
            : '';
          
          sql = `ALTER TABLE \`leave_types\` ADD COLUMN \`${column.name}\` DECIMAL(${precision},${scale}) ${nullable} ${defaultValue} ${comment} ${afterClause}`;
        } else if (column.definition.type.includes('VARCHAR')) {
          const length = column.definition.type.match(/VARCHAR\((\d+)\)/)?.[1] || '255';
          const nullable = column.definition.allowNull ? 'NULL' : 'NOT NULL';
          const defaultValue = column.definition.defaultValue !== undefined 
            ? `DEFAULT '${column.definition.defaultValue}'` 
            : '';
          const comment = column.definition.comment 
            ? `COMMENT '${column.definition.comment.replace(/'/g, "\\'")}'` 
            : '';
          
          sql = `ALTER TABLE \`leave_types\` ADD COLUMN \`${column.name}\` VARCHAR(${length}) ${nullable} ${defaultValue} ${comment} ${afterClause}`;
        } else if (column.definition.type === 'INTEGER') {
          const nullable = column.definition.allowNull ? 'NULL' : 'NOT NULL';
          const defaultValue = column.definition.defaultValue !== undefined 
            ? `DEFAULT ${column.definition.defaultValue}` 
            : '';
          const comment = column.definition.comment 
            ? `COMMENT '${column.definition.comment.replace(/'/g, "\\'")}'` 
            : '';
          
          sql = `ALTER TABLE \`leave_types\` ADD COLUMN \`${column.name}\` INT ${nullable} ${defaultValue} ${comment} ${afterClause}`;
        } else {
          await queryInterface.addColumn('leave_types', column.name, column.definition);
          console.log(`✅ Column '${column.name}' added successfully`);
          addedCount++;
          continue;
        }
        
        await sequelize.query(sql);
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
