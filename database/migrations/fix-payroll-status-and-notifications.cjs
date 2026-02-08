// database/migrations/fix-payroll-status-and-notifications.cjs
// 1) Ensure payroll_runs.status ENUM includes 'Pending Approval' (fix "Data truncated" on approval)
// 2) Ensure notifications table exists (fix "Table 'mini_hr_360.notifications' doesn't exist")

const { Sequelize, DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // ----- 1. Fix payroll_runs.status ENUM -----
      const [payrollRunsExists] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = DATABASE() AND table_name = 'payroll_runs'`,
        { transaction }
      );
      if (payrollRunsExists[0].count > 0) {
        try {
          await queryInterface.sequelize.query(
            `ALTER TABLE payroll_runs 
             MODIFY COLUMN status ENUM(
               'Draft', 
               'Processing', 
               'Pending Approval', 
               'Approved', 
               'Locked', 
               'Paid'
             ) DEFAULT 'Draft'`,
            { transaction }
          );
          console.log('   ✅ payroll_runs.status ENUM updated (includes Pending Approval)');
        } catch (err) {
          const msg = (err && err.message) ? err.message : '';
          if (msg.includes('Duplicate column') || msg.includes('already exists')) {
            console.log('   ℹ️  payroll_runs.status already has required values');
          } else {
            console.log('   ⚠️  payroll_runs.status update:', msg);
          }
        }
      }

      // ----- 2. Create notifications table if not exists -----
      const [notifExists] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = DATABASE() AND table_name = 'notifications'`,
        { transaction }
      );
      if (notifExists[0].count === 0) {
        await queryInterface.createTable(
          'notifications',
          {
            id: {
              type: DataTypes.INTEGER,
              primaryKey: true,
              autoIncrement: true,
            },
            userId: {
              type: DataTypes.INTEGER,
              allowNull: false,
              references: { model: 'users', key: 'id' },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
              field: 'userId',
            },
            businessId: {
              type: DataTypes.INTEGER,
              allowNull: true,
              references: { model: 'businesses', key: 'id' },
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
            title: { type: DataTypes.STRING(255), allowNull: false },
            message: { type: DataTypes.TEXT, allowNull: true },
            priority: {
              type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
              defaultValue: 'MEDIUM',
            },
            link: { type: DataTypes.STRING(500), allowNull: true },
            entityType: { type: DataTypes.STRING(50), allowNull: true, field: 'entityType' },
            entityId: { type: DataTypes.INTEGER, allowNull: true, field: 'entityId' },
            isRead: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'isRead' },
            readAt: { type: DataTypes.DATE, allowNull: true, field: 'readAt' },
            isDismissed: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'isDismissed' },
            targetRole: { type: DataTypes.STRING(50), allowNull: true, field: 'targetRole' },
            metadata: { type: DataTypes.JSON, allowNull: true },
            expiresAt: { type: DataTypes.DATE, allowNull: true, field: 'expiresAt' },
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
          },
          { transaction }
        );
        await queryInterface.addIndex('notifications', ['userId'], { transaction });
        await queryInterface.addIndex('notifications', ['businessId'], { transaction });
        await queryInterface.addIndex('notifications', ['type'], { transaction });
        await queryInterface.addIndex('notifications', ['isRead'], { transaction });
        await queryInterface.addIndex('notifications', ['targetRole'], { transaction });
        await queryInterface.addIndex('notifications', ['createdAt'], { transaction });
        console.log('   ✅ notifications table created');
      } else {
        console.log('   ℹ️  notifications table already exists');
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    // Optional: we don't drop notifications here to avoid data loss
    // Only payroll_runs.status would need reverting; leave as-is for safety
  },
};
