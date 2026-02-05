import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: './property.env' });

async function restoreDatabase() {
  const sqlFile = './database/15th Jan 2026/db.sql';
  
  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ SQL file not found: ${sqlFile}`);
    process.exit(1);
  }

  try {
    let sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Remove GTID_PURGED statements (can span multiple lines)
    sqlContent = sqlContent.replace(/SET @@GLOBAL\.GTID_PURGED=.*?;/s, '');
    sqlContent = sqlContent.replace(/SET @MYSQLDUMP_TEMP_LOG_BIN.*?;/s, '');
    sqlContent = sqlContent.replace(/SET @@SESSION\.SQL_LOG_BIN.*?;/s, '');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: false,
    });

    console.log(`🔄 Restoring database from: ./database/15th Jan 2026/db.sql`);
    
    // First drop and recreate the database
    try {
      await connection.query(`DROP DATABASE IF EXISTS ${process.env.DB_NAME}`);
    } catch (e) {
      console.log('   (DB already dropped or in use)');
    }
    
    // Wait a moment to release locks
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await connection.query(`CREATE DATABASE ${process.env.DB_NAME}`);
    
    // Connect to the recreated database
    await connection.changeUser({ database: process.env.DB_NAME });
    
    // Split SQL into individual statements and execute them
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`   Processing ${statements.length} SQL statements...`);
    let count = 0;
    
    for (const statement of statements) {
      try {
        await connection.query(statement + ';');
        count++;
        if (count % 50 === 0) {
          console.log(`   ✓ Processed ${count}/${statements.length} statements`);
        }
      } catch (e) {
        if (!e.message.includes('Duplicate entry') && !e.message.includes('already exists')) {
          console.error(`   ⚠️ Error on statement ${count}: ${e.message.substring(0, 100)}`);
        }
      }
    }
    
    await connection.end();
    
    console.log(`✅ Database restored successfully from 15th Jan 2026!`);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error restoring database:`, error.message);
    process.exit(1);
  }
}

restoreDatabase();
