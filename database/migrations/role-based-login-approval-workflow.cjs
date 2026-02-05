// database/migrations/role-based-login-approval-workflow.cjs
// Comprehensive migration for role-based login and payroll approval workflow
// Run: npx cross-env DOTENV_CONFIG_PATH=./property.env node database/migrations/role-based-login-approval-workflow.cjs

const { Sequelize, DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Starting role-based login and approval workflow migration...\n');

      // ============================================
      // 1. UPDATE USERS TABLE - Add new roles
      // ============================================
      console.log('1️⃣ Updating users.role ENUM to include new roles...');
      
      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE users 
          MODIFY COLUMN role ENUM(
            'admin', 
            'shop_owner', 
            'shop_manager', 
            'shop_worker', 
            'SUPER_ADMIN', 
            'HR_MANAGER', 
            'HR_EXECUTIVE', 
            'FINANCE', 
            'MANAGER', 
            'EMPLOYEE'
          ) DEFAULT 'shop_owner'
        `, { transaction });
        console.log('   ✅ users.role ENUM updated');
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('Duplicate')) {
          console.log('   ℹ️  users.role ENUM already has required values');
        } else {
          console.log('   ⚠️  users.role update note:', err.message);
        }
      }

      // ============================================
      // 2. CREATE PAYROLL_APPROVALS TABLE
      // ============================================
      console.log('\n2️⃣ Creating payroll_approvals table...');
      
      const [approvalTableExists] = await queryInterface.sequelize.query(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = DATABASE() AND table_name = 'payroll_approvals'
      `, { transaction });
      
      if (approvalTableExists[0].count === 0) {
        await queryInterface.createTable('payroll_approvals', {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          payrollRunId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: 'payroll_runs',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            field: 'payrollRunId',
          },
          businessId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: 'businesses',
              key: 'id',
            },
            field: 'businessId',
          },
          step: {
            type: DataTypes.INTEGER,
            allowNull: false,
          },
          stepName: {
            type: DataTypes.ENUM('HR_REVIEW', 'FINANCE_REVIEW'),
            allowNull: false,
            field: 'stepName',
          },
          status: {
            type: DataTypes.ENUM('WAITING', 'PENDING', 'APPROVED', 'REJECTED', 'SKIPPED'),
            defaultValue: 'WAITING',
          },
          approverId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id',
            },
            field: 'approverId',
          },
          comments: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          actionAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'actionAt',
          },
          deadline: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          autoApprove: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'autoApprove',
          },
          assignedToUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id',
            },
            field: 'assignedToUserId',
          },
          requiredRole: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'requiredRole',
          },
          createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        }, { transaction });

        // Add indexes
        await queryInterface.addIndex('payroll_approvals', ['payrollRunId'], { transaction });
        await queryInterface.addIndex('payroll_approvals', ['businessId'], { transaction });
        await queryInterface.addIndex('payroll_approvals', ['step'], { transaction });
        await queryInterface.addIndex('payroll_approvals', ['status'], { transaction });
        await queryInterface.addIndex('payroll_approvals', ['approverId'], { transaction });
        
        console.log('   ✅ payroll_approvals table created with indexes');
      } else {
        console.log('   ℹ️  payroll_approvals table already exists, updating schema...');
        
        // Update status ENUM to include WAITING
        try {
          await queryInterface.sequelize.query(`
            ALTER TABLE payroll_approvals 
            MODIFY COLUMN status ENUM('WAITING', 'PENDING', 'APPROVED', 'REJECTED', 'SKIPPED') 
            DEFAULT 'WAITING'
          `, { transaction });
          console.log('   ✅ payroll_approvals.status ENUM updated (added WAITING)');
        } catch (err) {
          console.log('   ⚠️  status ENUM update note:', err.message);
        }
        
        // Update stepName ENUM to remove ADMIN_APPROVAL
        try {
          // First check if any rows have ADMIN_APPROVAL
          const [adminRows] = await queryInterface.sequelize.query(`
            SELECT COUNT(*) as count FROM payroll_approvals WHERE stepName = 'ADMIN_APPROVAL'
          `, { transaction });
          
          if (adminRows[0].count > 0) {
            console.log('   ⚠️  Found existing ADMIN_APPROVAL rows - skipping stepName ENUM update');
          } else {
            await queryInterface.sequelize.query(`
              ALTER TABLE payroll_approvals 
              MODIFY COLUMN stepName ENUM('HR_REVIEW', 'FINANCE_REVIEW') NOT NULL
            `, { transaction });
            console.log('   ✅ payroll_approvals.stepName ENUM updated (removed ADMIN_APPROVAL)');
          }
        } catch (err) {
          console.log('   ⚠️  stepName ENUM update note:', err.message);
        }
      }

      // ============================================
      // 3. CREATE NOTIFICATIONS TABLE
      // ============================================
      console.log('\n3️⃣ Creating notifications table...');
      
      const [notifTableExists] = await queryInterface.sequelize.query(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = DATABASE() AND table_name = 'notifications'
      `, { transaction });
      
      if (notifTableExists[0].count === 0) {
        await queryInterface.createTable('notifications', {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            field: 'userId',
          },
          businessId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
              model: 'businesses',
              key: 'id',
            },
            field: 'businessId',
          },
          type: {
            type: DataTypes.ENUM(
              'PAYROLL_PENDING_APPROVAL',
              'PAYROLL_APPROVED',
              'PAYROLL_REJECTED',
              'PAYROLL_CREATED',
              'LEAVE_REQUEST',
              'LEAVE_APPROVED',
              'LEAVE_REJECTED',
              'SYSTEM_ALERT',
              'INFO'
            ),
            allowNull: false,
          },
          title: {
            type: DataTypes.STRING(255),
            allowNull: false,
          },
          message: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          priority: {
            type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
            defaultValue: 'MEDIUM',
          },
          link: {
            type: DataTypes.STRING(500),
            allowNull: true,
          },
          entityType: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'entityType',
          },
          entityId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'entityId',
          },
          isRead: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'isRead',
          },
          readAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'readAt',
          },
          isDismissed: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'isDismissed',
          },
          targetRole: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'targetRole',
          },
          metadata: {
            type: DataTypes.JSON,
            allowNull: true,
          },
          expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'expiresAt',
          },
          createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        }, { transaction });

        // Add indexes
        await queryInterface.addIndex('notifications', ['userId'], { transaction });
        await queryInterface.addIndex('notifications', ['businessId'], { transaction });
        await queryInterface.addIndex('notifications', ['type'], { transaction });
        await queryInterface.addIndex('notifications', ['isRead'], { transaction });
        await queryInterface.addIndex('notifications', ['targetRole'], { transaction });
        await queryInterface.addIndex('notifications', ['createdAt'], { transaction });
        
        console.log('   ✅ notifications table created with indexes');
      } else {
        console.log('   ℹ️  notifications table already exists');
      }

      // ============================================
      // 4. SEED TEST USERS (Optional - for development)
      // ============================================
      console.log('\n4️⃣ Checking for test users...');
      
      const [hrUserExists] = await queryInterface.sequelize.query(`
        SELECT COUNT(*) as count FROM users WHERE email = 'hr@demo.com'
      `, { transaction });
      
      if (hrUserExists[0].count === 0) {
        console.log('   ℹ️  No test users found. You can create them with:');
        console.log('      - HR User: hr@demo.com / HrPass123!');
        console.log('      - Finance User: finance@demo.com / FinPass123!');
        console.log('      (Use the registration API or seed script)');
      } else {
        console.log('   ✅ Test users already exist');
      }

      await transaction.commit();
      
      console.log('\n' + '='.repeat(50));
      console.log('🎉 Migration completed successfully!');
      console.log('='.repeat(50));
      console.log('\nSummary of changes:');
      console.log('  • users.role ENUM: Added SUPER_ADMIN, HR_MANAGER, HR_EXECUTIVE, FINANCE, MANAGER, EMPLOYEE');
      console.log('  • payroll_approvals table: Created/Updated with WAITING status');
      console.log('  • notifications table: Created for approval workflow notifications');
      console.log('\nApproval Workflow Steps:');
      console.log('  1. HR_REVIEW - HR team approves first');
      console.log('  2. FINANCE_REVIEW - Finance team approves after HR');
      console.log('='.repeat(50));

    } catch (error) {
      await transaction.rollback();
      console.error('\n❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Rolling back role-based login and approval workflow migration...\n');

      // Drop tables
      await queryInterface.dropTable('payroll_approvals', { transaction });
      console.log('   ✅ Dropped payroll_approvals table');
      
      await queryInterface.dropTable('notifications', { transaction });
      console.log('   ✅ Dropped notifications table');

      // Revert users.role ENUM (keep original roles)
      await queryInterface.sequelize.query(`
        ALTER TABLE users 
        MODIFY COLUMN role ENUM('admin', 'shop_owner', 'shop_manager', 'shop_worker') 
        DEFAULT 'shop_owner'
      `, { transaction });
      console.log('   ✅ Reverted users.role ENUM');

      await transaction.commit();
      console.log('\n🎉 Rollback completed successfully!');

    } catch (error) {
      await transaction.rollback();
      console.error('\n❌ Rollback failed:', error.message);
      throw error;
    }
  },
};

// Allow running directly with: node database/migrations/role-based-login-approval-workflow.cjs
if (require.main === module) {
  const path = require('path');
  require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || './property.env' });
  
  const { Sequelize } = require('sequelize');
  
  const sequelize = new Sequelize(
    process.env.MYSQL_DATABASE || process.env.DB_NAME,
    process.env.MYSQL_USER || process.env.DB_USER,
    process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD,
    {
      host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
      port: process.env.MYSQL_PORT || process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: false,
    }
  );
  
  const queryInterface = sequelize.getQueryInterface();
  
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('📊 Connected to database\n');
      
      await module.exports.up(queryInterface);
      
      await sequelize.close();
      process.exit(0);
    } catch (error) {
      console.error('Migration error:', error);
      await sequelize.close();
      process.exit(1);
    }
  })();
}
