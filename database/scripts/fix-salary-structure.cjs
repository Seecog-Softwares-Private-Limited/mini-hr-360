// Script to add missing columns to salary_structures table
// Run with: node -r dotenv/config database/scripts/fix-salary-structure.cjs
// Make sure DOTENV_CONFIG_PATH is set to ./property.env

const mysql = require('mysql2/promise');
require('dotenv').config({ path: './property.env' });

async function fixSalaryStructure() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'mini_hr_360',
    });

    try {
        // Check if version column exists
        const [versionCheck] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'salary_structures' AND COLUMN_NAME = 'version'
    `, [process.env.DB_NAME || 'mini_hr_360']);

        if (versionCheck.length === 0) {
            console.log('Adding version column...');
            await connection.query(`ALTER TABLE salary_structures ADD COLUMN version INT DEFAULT 1`);
            console.log('✅ version column added');
        } else {
            console.log('✅ version column already exists');
        }

        // Check if status column exists
        const [statusCheck] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'salary_structures' AND COLUMN_NAME = 'status'
    `, [process.env.DB_NAME || 'mini_hr_360']);

        if (statusCheck.length === 0) {
            console.log('Adding status column...');
            await connection.query(`ALTER TABLE salary_structures ADD COLUMN status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE'`);
            console.log('✅ status column added');
        } else {
            console.log('✅ status column already exists');
        }

        console.log('\n✅ Fix complete! Salary structure creation should now work.');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

fixSalaryStructure();
