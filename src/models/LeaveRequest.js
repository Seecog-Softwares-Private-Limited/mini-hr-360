import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

export const LeaveRequest = sequelize.define('LeaveRequest', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    businessId: { type: DataTypes.INTEGER, allowNull: false },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    leaveTypeId: { type: DataTypes.INTEGER, allowNull: false },

    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    totalDays: { type: DataTypes.DECIMAL(5, 2), allowNull: false },

    // Half-day support
    isHalfDayStart: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'If true, start date is half day',
    },
    isHalfDayEnd: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'If true, end date is half day',
    },
    halfDaySession: {
        type: DataTypes.ENUM('FIRST_HALF', 'SECOND_HALF'),
        allowNull: true,
        comment: 'For single day half-day leave',
    },

    reason: { type: DataTypes.TEXT },
    managerNote: { type: DataTypes.TEXT },

    // Attachment support
    attachmentUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL/path to attached document',
    },
    attachmentName: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },

    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELED'),
        allowNull: false,
        defaultValue: 'PENDING',
    },
    approverId: { type: DataTypes.INTEGER, allowNull: true },
    approvedAt: { type: DataTypes.DATE },
    rejectedAt: { type: DataTypes.DATE },
    canceledAt: { type: DataTypes.DATE },
}, {
    tableName: 'leave_requests',
    timestamps: true,
    paranoid: true,
    indexes: [
        { fields: ['businessId'] },
        { fields: ['employeeId'] },
        { fields: ['leaveTypeId'] },
        { fields: ['status'] },
        { fields: ['startDate', 'endDate'] },
    ],
});
