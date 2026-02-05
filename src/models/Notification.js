// src/models/Notification.js
// Model for system notifications (payroll approvals, alerts, etc.)
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const Notification = sequelize.define(
    'Notification',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        // Target user who should see this notification
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        // Business context
        businessId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'businesses',
                key: 'id',
            },
        },
        // Notification type for categorization
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
        // Title/subject
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        // Detailed message
        message: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        // Priority level
        priority: {
            type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
            defaultValue: 'MEDIUM',
        },
        // Link to related entity (e.g., /admin/payroll/runs?id=5)
        link: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        // Reference to related entity
        entityType: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'e.g., PayrollRun, LeaveRequest',
        },
        entityId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        // Read status
        isRead: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        readAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        // Dismissed (user clicked X)
        isDismissed: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        // Optional: target role (if notification is for all users with a role)
        targetRole: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'If set, all users with this role should see notification',
        },
        // Metadata (JSON for extra data)
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        // Expiry (optional - auto-dismiss after this date)
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: 'notifications',
        timestamps: true,
        indexes: [
            { fields: ['userId'] },
            { fields: ['businessId'] },
            { fields: ['type'] },
            { fields: ['isRead'] },
            { fields: ['targetRole'] },
            { fields: ['createdAt'] },
        ],
    }
);

export { Notification };
export default Notification;
