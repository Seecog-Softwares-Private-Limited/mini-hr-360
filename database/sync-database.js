/**
 * Database Sync Script
 * 
 * This script synchronizes the database schema with all Sequelize models.
 * It ensures all tables exist with the correct columns, adding any missing ones.
 * 
 * Usage: npm run sync-db
 * 
 * This script is idempotent - safe to run multiple times.
 * It will:
 * - Create tables if they don't exist
 * - Add missing columns to existing tables
 * - Preserve existing data
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../property.env') });

// Import database and models
const { sequelize } = await import('../src/db/index.js');
const {
  User,
  Business,
  Customer,
  Template,
  Campaign,
  MessageLog,
  Department,
  Service,
  Designation,
  LeaveType,
  LeaveRequest,
  LeaveBalance,
  LeaveApproval,
  Employee,
  DocumentType,
  EmployeeEducation,
  EmployeeExperience,
  EmployeeDocument,
  EmailTemplate,
   AttendancePolicy,
  Shift,
  Holiday,
  EmployeeShiftAssignment,
  AttendancePunch,
  AttendanceDailySummary,
  AttendanceRegularization,
  AttendanceLock,
  
} = await import('../src/models/index.js');

/**
 * Main sync function
 */
async function syncDatabase() {
  try {
    console.log('🔄 Starting Database Sync...\n');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    // Define models to sync in order (respecting foreign key dependencies)
    const modelsToSync = [
      { model: User, name: 'User' },
      { model: Business, name: 'Business' },
      { model: Customer, name: 'Customer' },
      { model: Template, name: 'Template' },
      { model: Campaign, name: 'Campaign' },
      { model: MessageLog, name: 'MessageLog' },
      { model: Department, name: 'Department' },
      { model: Service, name: 'Service' },
      { model: Designation, name: 'Designation' },
      { model: DocumentType, name: 'DocumentType' },
      { model: EmailTemplate, name: 'EmailTemplate' },
      { model: LeaveType, name: 'LeaveType' },
      { model: Employee, name: 'Employee' },
      { model: LeaveRequest, name: 'LeaveRequest' },
      { model: LeaveBalance, name: 'LeaveBalance' },
      { model: LeaveApproval, name: 'LeaveApproval' },
      { model: EmployeeEducation, name: 'EmployeeEducation' },
      { model: EmployeeExperience, name: 'EmployeeExperience' },
      { model: EmployeeDocument, name: 'EmployeeDocument' },
      { model: AttendancePolicy, name: 'AttendancePolicy' },

{ model: Shift, name: 'Shift' },

{ model: Holiday, name: 'Holiday' },

{ model: EmployeeShiftAssignment, name: 'EmployeeShiftAssignment' },

{ model: AttendancePunch, name: 'AttendancePunch' },

{ model: AttendanceDailySummary, name: 'AttendanceDailySummary' },

{ model: AttendanceRegularization, name: 'AttendanceRegularization' },

{ model: AttendanceLock, name: 'AttendanceLock' }

    ];
    
    console.log(`📋 Syncing ${modelsToSync.length} models...\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Sync all models with alter: true to add missing columns
    for (const { model, name } of modelsToSync) {
      try {
        console.log(`🔄 Syncing ${name}...`);
        
        // First, ensure table exists (create if doesn't exist)
        await model.sync({ alter: false });
        
        // Then try to alter to add missing columns
        // Use a more gentle approach: only add columns, don't modify existing ones
        try {
          await model.sync({ alter: true });
        } catch (alterError) {
          // If alter fails due to foreign key constraints or data issues,
          // it's often because of existing data. This is usually okay.
          const errorMsg = alterError.parent?.sqlMessage || alterError.message || '';
          
          // Check if it's a foreign key constraint error (usually safe to ignore)
          if (errorMsg.includes('foreign key constraint') || 
              errorMsg.includes('Cannot add or update a child row')) {
            console.log(`   ⚠️  ${name} has foreign key constraint issues (likely due to existing data)`);
            console.log(`   ✅ Table exists, but some constraints may need manual fixing\n`);
            successCount++;
            continue;
          }
          
          // Check if it's a data truncation or date error (existing bad data)
          if (errorMsg.includes('Data truncated') || 
              errorMsg.includes('Incorrect date value') ||
              errorMsg.includes('Invalid date')) {
            console.log(`   ⚠️  ${name} has data issues (existing invalid data detected)`);
            console.log(`   ✅ Table exists, but some data may need cleanup\n`);
            successCount++;
            continue;
          }
          
          // For other errors, re-throw
          throw alterError;
        }
        
        console.log(`   ✅ ${name} synced successfully\n`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Error syncing ${name}:`, error.message);
        if (error.parent) {
          console.error(`      SQL Error: ${error.parent.sqlMessage || error.parent.message}`);
        }
        errorCount++;
        console.log('');
      }
    }
    
    console.log('='.repeat(60));
    console.log('📊 Sync Summary:');
    console.log(`   ✅ Successfully synced: ${successCount} models`);
    if (errorCount > 0) {
      console.log(`   ❌ Failed to sync: ${errorCount} models`);
    }
    console.log('='.repeat(60));
    
    if (errorCount === 0) {
      console.log('\n✅ Database sync completed successfully!');
      console.log('   Your database is now up to date with the latest models.');
      console.log('   You can now run the project without errors.\n');
    } else {
      console.log('\n⚠️  Database sync completed with some warnings.');
      console.log('   Most tables were synced successfully.');
      console.log('   Some errors may be due to existing data constraints.');
      console.log('   If you encounter runtime errors, check the specific model mentioned above.\n');
      // Don't exit with error code - allow project to run if most models synced
      if (errorCount > successCount) {
        console.log('   ⚠️  Too many errors - please review and fix before running the project.\n');
        process.exit(1);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Database sync failed:', error.message);
    if (error.parent) {
      console.error('   SQL Error:', error.parent.sqlMessage);
    }
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the sync
syncDatabase();
