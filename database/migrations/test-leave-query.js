/**
 * Test Script: Test the exact query that was failing
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../property.env') });

const { sequelize } = await import('../../src/db/index.js');
const { LeaveRequest, LeaveType, Employee, User } = await import('../../src/models/index.js');

async function testQuery() {
  try {
    console.log('🧪 Testing LeaveRequest.findAndCountAll query...\n');

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Test the exact query from the controller
    console.log('Testing findAndCountAll with includes...');
    const { count, rows: requests } = await LeaveRequest.findAndCountAll({
      where: {},
      include: [
        { model: LeaveType, as: 'leaveType', attributes: ['id', 'name', 'code', 'color'] },
        { model: Employee, as: 'employee', attributes: ['id', 'empId', 'empName', 'empDepartment', 'empDesignation'] },
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 20,
      offset: 0,
    });

    console.log(`✅ Query successful!`);
    console.log(`   Found ${count} leave requests`);
    console.log(`   Returned ${requests.length} rows\n`);

    // Test LeaveType query
    console.log('Testing LeaveType.findAndCountAll query...');
    const { count: ltCount, rows: leaveTypes } = await LeaveType.findAndCountAll({
      where: {},
      include: [{ model: (await import('../../src/models/index.js')).Business, as: 'business', attributes: ['id', 'businessName'] }],
      order: [['name', 'ASC']],
      limit: 10,
      offset: 0,
      paranoid: false,
    });

    console.log(`✅ Query successful!`);
    console.log(`   Found ${ltCount} leave types`);
    console.log(`   Returned ${leaveTypes.length} rows\n`);

    console.log('✅ All queries passed! Leave management should work now.');

  } catch (error) {
    console.error('❌ Query failed:', error.message);
    if (error.parent) {
      console.error('   SQL Error:', error.parent.sqlMessage);
      console.error('   SQL:', error.parent.sql);
    }
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Database connection closed');
  }
}

testQuery();
