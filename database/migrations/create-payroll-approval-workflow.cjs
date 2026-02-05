// database/migrations/create-payroll-approval-workflow.cjs
// Migration to create payroll approval workflow tables

const { Sequelize, DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Create payroll_approvals table
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
        type: DataTypes.ENUM('HR_REVIEW', 'FINANCE_REVIEW', 'ADMIN_APPROVAL'),
        allowNull: false,
        field: 'stepName',
      },
      status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED'),
        defaultValue: 'PENDING',
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
    });

    // Add indexes
    await queryInterface.addIndex('payroll_approvals', ['payrollRunId']);
    await queryInterface.addIndex('payroll_approvals', ['businessId']);
    await queryInterface.addIndex('payroll_approvals', ['step']);
    await queryInterface.addIndex('payroll_approvals', ['status']);
    await queryInterface.addIndex('payroll_approvals', ['approverId']);

    // Create notifications table
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
    });

    // Add indexes
    await queryInterface.addIndex('notifications', ['userId']);
    await queryInterface.addIndex('notifications', ['businessId']);
    await queryInterface.addIndex('notifications', ['type']);
    await queryInterface.addIndex('notifications', ['isRead']);
    await queryInterface.addIndex('notifications', ['targetRole']);
    await queryInterface.addIndex('notifications', ['createdAt']);

    console.log('✅ Created payroll_approvals and notifications tables');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payroll_approvals');
    await queryInterface.dropTable('notifications');
    console.log('✅ Dropped payroll_approvals and notifications tables');
  },
};
