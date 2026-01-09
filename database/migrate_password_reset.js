// Migration script to add password reset fields to users table
// Run: DOTENV_CONFIG_PATH=./property.env node -r dotenv/config database/migrate_password_reset.js

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', 'property.env') });

const {
  DB_HOST = 'localhost',
  DB_PORT = 3306,
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'mini_hr_360'
} = process.env;

async function migrate() {
  let connection;
  
  try {
    console.log('🔧 Connecting to database...');
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: parseInt(DB_PORT),
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      multipleStatements: true
    });

    console.log('✅ Connected to database:', DB_NAME);

    // First, check if the users table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'users'
    `, [DB_NAME]);

    if (tables.length === 0) {
      console.error('❌ Error: The "users" table does not exist in the database.');
      console.error('💡 Please run the database seed script first: npm run seed-db');
      console.error('   Or create the users table manually before running this migration.');
      throw new Error('Users table does not exist');
    }

    console.log('✅ Users table exists');

    // Check if columns already exist
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME IN ('passwordResetToken', 'passwordResetExpires')
    `, [DB_NAME]);

    const existingColumns = columns.map(col => col.COLUMN_NAME);

    if (existingColumns.includes('passwordResetToken') && existingColumns.includes('passwordResetExpires')) {
      console.log('✅ Password reset columns already exist. Skipping migration.');
      return;
    }

    console.log('📝 Adding password reset columns...');

    // Add columns if they don't exist
    // Note: MySQL doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
    // So we check first and only add if missing
    if (!existingColumns.includes('passwordResetToken')) {
      try {
        await connection.execute(`
          ALTER TABLE users 
          ADD COLUMN passwordResetToken VARCHAR(255) NULL AFTER refreshTokenExpiresAt
        `);
        console.log('✅ Added passwordResetToken column');
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log('ℹ️  passwordResetToken column already exists');
        } else {
          throw err;
        }
      }
    }

    if (!existingColumns.includes('passwordResetExpires')) {
      try {
        await connection.execute(`
          ALTER TABLE users 
          ADD COLUMN passwordResetExpires DATETIME NULL AFTER passwordResetToken
        `);
        console.log('✅ Added passwordResetExpires column');
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log('ℹ️  passwordResetExpires column already exists');
        } else {
          throw err;
        }
      }
    }

    // Add indexes
    try {
      await connection.execute(`
        CREATE INDEX idx_password_reset_token ON users(passwordResetToken)
      `);
      console.log('✅ Created index on passwordResetToken');
    } catch (err) {
      if (err.code !== 'ER_DUP_KEYNAME') {
        throw err;
      }
      console.log('ℹ️  Index on passwordResetToken already exists');
    }

    try {
      await connection.execute(`
        CREATE INDEX idx_password_reset_expires ON users(passwordResetExpires)
      `);
      console.log('✅ Created index on passwordResetExpires');
    } catch (err) {
      if (err.code !== 'ER_DUP_KEYNAME') {
        throw err;
      }
      console.log('ℹ️  Index on passwordResetExpires already exists');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('📋 Password reset fields have been added to the users table.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

migrate();

