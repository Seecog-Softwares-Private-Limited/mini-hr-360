// src/db/index.js
import { Sequelize } from 'sequelize';
import mysql from 'mysql2/promise';

// --- helpers ---
// const req = (key, fallback) => {
//   const v = process.env[key] ?? fallback;
//   if (v === undefined || v === null || v === '') {
//     throw new Error(`Missing required env: ${key}`);
//   }
//   return v;
// };

// --- env (already loaded in index.js) ---
const NODE_ENV = process.env.NODE_ENV || 'development';

// Select database config based on NODE_ENV
// Development: Use Stage config
// Production: Use Production config
let DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD;

if (NODE_ENV === 'development') {
  // Stage/Development database config
  DB_HOST = process.env.DB_HOST_STAGE || 'localhost';
  DB_PORT = Number(process.env.DB_PORT_STAGE || 3306);
  DB_NAME = process.env.DB_NAME_STAGE || 'mini_hr_360';
  DB_USER = process.env.DB_USER_STAGE || 'root';
  DB_PASSWORD = process.env.DB_PASSWORD_STAGE || '';
  console.log('🔧 Using STAGE database config (NODE_ENV=development)');
} else {
  // Production database config
  DB_HOST = process.env.DB_HOST;
  DB_PORT = Number(process.env.DB_PORT || 3306);
  DB_NAME = process.env.DB_NAME || 'mini_hr_360';
  DB_USER = process.env.DB_USER;
  DB_PASSWORD = process.env.DB_PASSWORD;
  console.log('🔧 Using PRODUCTION database config (NODE_ENV=production)');
}

// Debug: Log the database configuration
console.log("DB_HOST : ", DB_HOST);
console.log("DB_PORT : ", DB_PORT);
console.log("DB_NAME : ", DB_NAME);
console.log("DB_USER : ", DB_USER);
console.log("NODE_ENV : ", NODE_ENV);

// Debug: Log the database name being used
if (DB_NAME === 'saas_whatsapp_manager') {
  console.error("❌ ERROR: Database name is still 'saas_whatsapp_manager'! Check property.env file.");
  console.error("   Expected: mini_hr_360");
  console.error("   Got: ", DB_NAME);
}

const CREATE_DB_IF_MISSING = (process.env.CREATE_DB_IF_MISSING || 'false') === 'true';
const SYNC_DB = (process.env.SYNC_DB || 'false') === 'true';

// --- sequelize instance ---
// Ensure we're using the correct database name
const databaseName = DB_NAME || 'mini_hr_360';
console.log(`🔧 Initializing Sequelize with database: ${databaseName}`);

export const sequelize = new Sequelize(databaseName, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  dialectOptions: { charset: 'utf8mb4' },
  define: { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
});

// --- connector ---
const connectDB = async () => {
  try {
    if (CREATE_DB_IF_MISSING) {
      const conn = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
      });
      await conn.query(
        `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
      );
      await conn.end();
    }

    await sequelize.authenticate();
    const actualDbName = sequelize.getDatabaseName();
    console.log(`\n✅ MySQL connected → Database: ${DB_NAME} @ ${DB_HOST}:${DB_PORT}`);
    console.log(`📊 Sequelize reports database name: ${actualDbName}`);
    if (actualDbName !== DB_NAME) {
      console.warn(`⚠️  WARNING: Database name mismatch! Expected: ${DB_NAME}, Got: ${actualDbName}`);
    }

    await import('../models/index.js');

    if (SYNC_DB) {
      console.log('🔄 Starting schema sync...');
      try {
        // Sync creates tables if they don't exist, and alters them if they do
        // Using { alter: true } will add missing columns without dropping existing ones
        await sequelize.sync({ alter: true });
        console.log('✅ Schema synced successfully (alter mode).');
        console.log('ℹ️  Note: No seed data is loaded automatically.');
        
        // Verify users table exists
        const [results] = await sequelize.query("SHOW TABLES LIKE 'users'");
        if (results.length === 0) {
          console.error('⚠️  WARNING: Users table was not created during sync!');
          console.error('   Attempting to create tables with force: false...');
          await sequelize.sync({ force: false });
          console.log('✅ Tables created.');
        } else {
          console.log('✅ Verified: users table exists.');
        }
      } catch (syncError) {
        console.error('❌ Schema sync error:', syncError.message);
        console.error('Error details:', syncError);
        // Don't exit - allow server to continue, but log the error
        console.error('⚠️  Server will continue, but database may not be properly initialized.');
      }
    } else {
      console.log('ℹ️ Skipping schema sync (set SYNC_DB=true to enable).');
    }
  } catch (err) {
    console.error('❌ MySQL connection error:', err?.message || err);
    console.error('Full error:', err);
    process.exit(1);
  }
};

export default connectDB;
