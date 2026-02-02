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
console.log("DB_HOST : ", process.env.DB_HOST);
//Prod
const DB_HOST = process.env.DB_HOST;  // GoDaddy: 'localhost'; local can be '127.0.0.1'
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_NAME = process.env.DB_NAME || 'mini_hr_360';
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const CREATE_DB_IF_MISSING = (process.env.CREATE_DB_IF_MISSING || 'false') === 'true';
const SYNC_DB = (process.env.SYNC_DB || 'false') === 'true';

//Stage
// const DB_HOST = 'ls-322b13a438adc6602193777abc66dd7f1b391154.cd0w8y80q80x.ap-south-1.rds.amazonaws.com';  // GoDaddy: 'localhost'; local can be '127.0.0.1'
// const DB_PORT = Number(3306);
// const DB_NAME = 'saas_whatsapp_manager';
// const DB_USER = 'dbmasteruser';
// const DB_PASSWORD = '&s0rpr,(G2+1sv7rT3MGKa{c:-j<ebN:';
// const CREATE_DB_IF_MISSING = (process.env.CREATE_DB_IF_MISSING || 'false') === 'true';
// const SYNC_DB = (process.env.SYNC_DB || 'false') === 'true';

// --- sequelize instance ---
export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  dialectOptions: {
    charset: 'utf8mb4',
    timezone: '+05:30' // IST (India Standard Time)
  },
  timezone: '+05:30', // IST
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
    console.log(`\n✅ MySQL connected → ${sequelize.getDatabaseName()} @ ${DB_HOST}:${DB_PORT}`);
    import('fs').then(fs => fs.appendFileSync('debug.log', `[DB] PID: ${process.pid}, Connected to: ${sequelize.getDatabaseName()} @ ${DB_HOST}\n`));

    // --- models ---
    if (SYNC_DB) {
      console.log('🔄 Syncing Attendance models...');
      const {
        Business: BusinessModel, Employee: EmployeeModel,
        AttendancePolicy, Shift, Holiday, EmployeeShiftAssignment,
        AttendancePunch, AttendanceDailySummary, AttendanceRegularization, AttendanceLock,
        PayrollSetup, SalaryStructure, EmployeeSalaryStructure, PayrollRun, PayrollRegister, Payslip, PayrollQuery, EmployeeBankDetail,
        StatutoryCompliance
      } = await import('../models/index.js');

      // Disable FK checks to avoid issues with existing tables or circular deps
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true });

      const safeSync = async (model, name, force = false) => {
        try {
          const options = force ? { force: true } : { alter: true };
          await model.sync(options);
          console.log(`   ✅ ${name} synced`);
        } catch (e) {
          console.error(`   ⚠️ Failed to sync ${name}: ${e.message}`);
        }
      };

      // Ensure dependencies exist
      await safeSync(BusinessModel, 'Business');
      await safeSync(EmployeeModel, 'Employee');

      // Sync new models independent of each other
      await safeSync(AttendancePolicy, 'AttendancePolicy');
      await safeSync(Shift, 'Shift');
      await safeSync(Holiday, 'Holiday');
      await safeSync(EmployeeShiftAssignment, 'EmployeeShiftAssignment');
      await safeSync(AttendancePunch, 'AttendancePunch', true);
      await safeSync(AttendanceDailySummary, 'AttendanceDailySummary', true);
      await safeSync(AttendanceRegularization, 'AttendanceRegularization');
      await safeSync(AttendanceLock, 'AttendanceLock');

      console.log('🔄 Syncing Payroll models...');
      await safeSync(PayrollSetup, 'PayrollSetup');
      await safeSync(SalaryStructure, 'SalaryStructure');
      await safeSync(EmployeeSalaryStructure, 'EmployeeSalaryStructure');
      await safeSync(PayrollRun, 'PayrollRun');
      await safeSync(PayrollRegister, 'PayrollRegister');
      await safeSync(Payslip, 'Payslip');
      await safeSync(PayrollQuery, 'PayrollQuery');
      await safeSync(EmployeeBankDetail, 'EmployeeBankDetail');
      await safeSync(StatutoryCompliance, 'StatutoryCompliance');

      // Re-enable FK checks
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });
      console.log('🏁 Attendance structure sync attempt completed');
    } else {
      console.log('ℹ️ Skipping explicit model sync (SYNC_DB=false)');
    }

    if (SYNC_DB) {
      // Skip running a global `sequelize.sync({ alter: ... })` here because
      // large existing schemas can hit MySQL limits (eg. "Too many keys specified").
      // Use targeted model syncs or migrations instead.
      console.log('ℹ️ Skipping global sequelize.sync to avoid schema alter crashes. Use migrations for schema changes.');
    } else {
      console.log('ℹ️ Skipping full schema sync.');
    }
  } catch (err) {
    console.error('❌ MySQL connection error:', err?.message || err);
    process.exit(1);
  }
};

export default connectDB;
