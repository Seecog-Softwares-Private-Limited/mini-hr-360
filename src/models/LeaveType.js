import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

export const LeaveType = sequelize.define('LeaveType', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    businessId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(120), allowNull: false },
    code: { type: DataTypes.STRING(32) },
    description: { type: DataTypes.TEXT },
    status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' },
    sortOrder: { type: DataTypes.INTEGER },
    // New fields for leave management
    isPaid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this leave type is paid',
    },
    allowHalfDay: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether half-day leave is allowed',
    },
    maxPerYear: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Maximum leaves allowed per year (null = unlimited)',
    },
    allowCarryForward: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether unused leaves can be carried forward',
    },
    maxCarryForward: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Maximum leaves that can be carried forward',
    },
    requiresAttachment: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether attachment is required for this leave type',
    },
    minDaysNotice: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Minimum days notice required for applying',
    },
    color: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: '#6366f1',
        comment: 'Color code for UI display',
    },
}, {
    tableName: 'leave_types',
    timestamps: true,
    paranoid: true, // deletedAt
});
