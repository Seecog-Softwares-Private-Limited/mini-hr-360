/**
 * Test Script: Test the Employee query that was failing
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../property.env') });

const { sequelize } = await import('../../src/db/index.js');
const { Employee } = await import('../../src/models/index.js');

async function testQuery() {
  try {
    console.log('🧪 Testing Employee.findAll query...\n');

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Test the exact query from the controller
    console.log('Testing Employee.findAll...');
    const employees = await Employee.findAll({
      where: { userId: 25 },
      order: [['empId', 'ASC']],
    });

    console.log(`✅ Query successful!`);
    console.log(`   Found ${employees.length} employees\n`);

    console.log('✅ Employee query works! The employees page should load now.');

  } catch (error) {
    console.error('❌ Query failed:', error.message);
    if (error.parent) {
      console.error('   SQL Error:', error.parent.sqlMessage);
      console.error('   SQL:', error.parent.sql?.substring(0, 200) + '...');
    }
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Database connection closed');
  }
}

testQuery();
