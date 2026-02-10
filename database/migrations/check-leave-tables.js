/**
 * Diagnostic Script: Check Leave Management Tables
 * 
 * This script checks if all required tables and columns exist
 * for the leave management system.
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

async function checkTables() {
  try {
    console.log('🔍 Checking Leave Management Tables...\n');

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const queryInterface = sequelize.getQueryInterface();

    // Check if leave_requests table exists
    const tables = await sequelize.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('leave_requests', 'leave_types', 'leave_balances', 'leave_approvals')",
      {
        replacements: [process.env.DB_NAME || 'mini_hr_360'],
        type: sequelize.QueryTypes.SELECT
      }
    );

    console.log('📋 Existing Tables:');
    const existingTables = tables.map(t => t.TABLE_NAME);
    console.log('   ', existingTables.join(', ') || 'None found\n');

    // Check leave_requests table
    if (existingTables.includes('leave_requests')) {
      console.log('\n✅ leave_requests table exists');
      const lrColumns = await queryInterface.describeTable('leave_requests');
      console.log(`   Columns: ${Object.keys(lrColumns).length}`);
      
      // Check for required columns
      const requiredColumns = ['isHalfDayStart', 'isHalfDayEnd', 'halfDaySession', 'attachmentUrl', 'attachmentName'];
      const missingColumns = requiredColumns.filter(col => !lrColumns[col]);
      
      if (missingColumns.length > 0) {
        console.log(`   ⚠️  Missing columns: ${missingColumns.join(', ')}`);
      } else {
        console.log('   ✅ All required columns exist');
      }
    } else {
      console.log('\n❌ leave_requests table does NOT exist');
    }

    // Check leave_types table
    if (existingTables.includes('leave_types')) {
      console.log('\n✅ leave_types table exists');
      const ltColumns = await queryInterface.describeTable('leave_types');
      console.log(`   Columns: ${Object.keys(ltColumns).length}`);
    } else {
      console.log('\n❌ leave_types table does NOT exist');
    }

    // Try to query leave_requests to see the actual error
    console.log('\n🔍 Testing LeaveRequest query...');
    try {
      const result = await sequelize.query('SELECT COUNT(*) as count FROM leave_requests LIMIT 1', {
        type: sequelize.QueryTypes.SELECT
      });
      console.log('   ✅ Basic query works');
    } catch (error) {
      console.log('   ❌ Query failed:', error.message);
      console.log('   SQL Error:', error.parent?.sqlMessage || error.sqlMessage);
    }

    // Try to query with JOIN to see if foreign keys work
    console.log('\n🔍 Testing JOIN query...');
    try {
      const result = await sequelize.query(`
        SELECT lr.id, lr.businessId, lr.employeeId, lr.leaveTypeId, lt.name as leaveTypeName
        FROM leave_requests lr
        LEFT JOIN leave_types lt ON lr.leaveTypeId = lt.id
        LIMIT 1
      `, {
        type: sequelize.QueryTypes.SELECT
      });
      console.log('   ✅ JOIN query works');
    } catch (error) {
      console.log('   ❌ JOIN query failed:', error.message);
      console.log('   SQL Error:', error.parent?.sqlMessage || error.sqlMessage);
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    if (error.parent) {
      console.error('   SQL Error:', error.parent.sqlMessage);
      console.error('   SQL:', error.parent.sql);
    }
  }
  // Do not close sequelize - migration runner owns the shared connection
}

checkTables();
