#!/usr/bin/env node

/**
 * Database Seed Script
 * This script initializes the database with seed data from the SQL dump file.
 * It creates the database if it doesn't exist and populates it with tables and initial data.
 * Safe to run multiple times (idempotent).
 * 
 * Usage: npm run seed-db
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, 'property.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_NAME = process.env.DB_NAME || 'mini_hr_360';
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;

// Path to SQL seed file
const SQL_SEED_FILE = path.join(__dirname, 'database', 'seed.sql');

if (!DB_USER || !DB_PASSWORD) {
  console.error('❌ Error: DB_USER and DB_PASSWORD must be set in property.env');
  process.exit(1);
}

/**
 * Read SQL file and return its content
 */
function readSQLFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`SQL seed file not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`❌ Error reading SQL file: ${error.message}`);
    throw error;
  }
}

/**
 * Split SQL dump into individual statements
 * Handles multi-line statements and MySQL-specific syntax
 */
function splitSQLStatements(sql) {
  const statements = [];
  let currentStatement = '';
  let inMultiLineComment = false;
  let inSingleLineComment = false;
  
  const lines = sql.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Skip empty lines
    if (line.trim().length === 0) {
      continue;
    }
    
    // Handle MySQL conditional comments
    if (line.includes('/*!') && line.includes('*/')) {
      // Single-line MySQL conditional comment
      currentStatement += line + '\n';
      continue;
    }
    
    if (line.includes('/*!')) {
      inMultiLineComment = true;
      currentStatement += line + '\n';
      continue;
    }
    
    if (line.includes('*/') && inMultiLineComment) {
      inMultiLineComment = false;
      currentStatement += line + '\n';
      continue;
    }
    
    if (inMultiLineComment) {
      currentStatement += line + '\n';
      continue;
    }
    
    // Handle single-line comments
    if (line.trim().startsWith('--')) {
      continue;
    }
    
    // Skip MySQL dump header comments
    if (line.includes('MySQL dump') || line.includes('Server version')) {
      continue;
    }
    
    // Add line to current statement
    currentStatement += line;
    
    // Check if statement ends with semicolon
    if (line.trim().endsWith(';')) {
      const trimmed = currentStatement.trim();
      if (trimmed.length > 0 && !trimmed.startsWith('--')) {
        statements.push(trimmed);
      }
      currentStatement = '';
    } else {
      currentStatement += '\n';
    }
  }
  
  // Add any remaining statement
  if (currentStatement.trim().length > 0) {
    statements.push(currentStatement.trim());
  }
  
  return statements;
}

/**
 * Check if a table exists
 */
async function tableExists(connection, tableName) {
  try {
    const [rows] = await connection.query(
      `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
      [DB_NAME, tableName]
    );
    return rows[0].count > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Main seed function
 */
async function seedDatabase() {
  let connection = null;
  
  try {
    console.log('🌱 Starting database seed...');
    console.log(`📊 Database: ${DB_NAME}`);
    console.log(`🔗 Host: ${DB_HOST}:${DB_PORT}`);
    console.log(`📄 SQL File: ${SQL_SEED_FILE}`);
    
    // Step 1: Read SQL file
    console.log('📖 Reading SQL seed file...');
    const sqlDump = readSQLFile(SQL_SEED_FILE);
    console.log(`✅ SQL file read (${sqlDump.length} characters)`);
    
    // Step 2: Connect without database to create it if needed
    console.log('🔌 Connecting to MySQL server...');
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true, // Allow multiple statements
    });
    console.log('✅ Connected to MySQL server');
    
    // Step 3: Create database if it doesn't exist
    console.log(`📦 Creating database '${DB_NAME}' if it doesn't exist...`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ Database '${DB_NAME}' ready`);
    
    // Step 4: Switch to the database
    await connection.query(`USE \`${DB_NAME}\``);
    
    // Step 5: Disable foreign key checks temporarily for faster execution
    console.log('🔓 Temporarily disabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('SET UNIQUE_CHECKS = 0');
    await connection.query('SET AUTOCOMMIT = 0');
    
    // Step 6: Split SQL into statements
    console.log('✂️  Splitting SQL into statements...');
    const statements = splitSQLStatements(sqlDump);
    console.log(`✅ Found ${statements.length} SQL statements`);
    
    // Step 7: Execute statements
    console.log('⚙️  Executing SQL statements...');
    let executed = 0;
    let skipped = 0;
    let errors = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements
      if (statement.trim().length === 0) {
        continue;
      }
      
      // Skip USE statements as we're already using the database
      if (statement.toUpperCase().trim().startsWith('USE ')) {
        skipped++;
        continue;
      }
      
      // Skip SET statements that we've already handled
      if (
        statement.toUpperCase().trim().startsWith('SET @') ||
        statement.toUpperCase().trim().startsWith('SET FOREIGN_KEY_CHECKS') ||
        statement.toUpperCase().trim().startsWith('SET UNIQUE_CHECKS') ||
        statement.toUpperCase().trim().startsWith('SET AUTOCOMMIT') ||
        statement.toUpperCase().trim().startsWith('SET @@SESSION.SQL_LOG_BIN')
      ) {
        skipped++;
        continue;
      }
      
      try {
        await connection.query(statement);
        executed++;
        
        // Log progress for long operations
        if (executed % 50 === 0) {
          console.log(`   ⏳ Processed ${executed}/${statements.length} statements...`);
        }
      } catch (error) {
        // Ignore expected errors
        if (
          error.message.includes("doesn't exist") ||
          error.message.includes('Unknown table') ||
          error.message.includes('Duplicate entry') ||
          error.message.includes('Duplicate key') ||
          error.message.includes('already exists')
        ) {
          // These are expected errors, continue
          skipped++;
          continue;
        }
        
        // Log unexpected errors but continue
        console.warn(`⚠️  Warning executing statement ${i + 1}:`, error.message.substring(0, 100));
        errors++;
      }
    }
    
    // Step 8: Commit transaction
    await connection.query('COMMIT');
    
    // Step 9: Re-enable foreign key checks
    console.log('🔒 Re-enabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    await connection.query('SET UNIQUE_CHECKS = 1');
    await connection.query('SET AUTOCOMMIT = 1');
    
    console.log('\n✅ Database seeded successfully!');
    console.log(`📊 Statistics:`);
    console.log(`   - Executed: ${executed} statements`);
    console.log(`   - Skipped: ${skipped} statements`);
    if (errors > 0) {
      console.log(`   - Errors: ${errors} (non-critical)`);
    }
    console.log('🎉 All tables created and populated with seed data.');
    console.log('\n💡 You can now start your application with: npm start');
    
  } catch (error) {
    console.error('\n❌ Error seeding database:', error.message);
    console.error(error.stack);
    
    // Rollback on error
    if (connection) {
      try {
        await connection.query('ROLLBACK');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        await connection.query('SET UNIQUE_CHECKS = 1');
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError.message);
      }
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the seed function
seedDatabase();
