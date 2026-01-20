
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const AttendanceLock = sequelize.define(
    'AttendanceLock',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        businessId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'businesses',
                key: 'id',
            },
        },
        period: {
            type: DataTypes.STRING(7), // YYYY-MM
            allowNull: false,
        },
        lockedByUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        lockedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        unlockNote: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        tableName: 'attendance_locks',
        timestamps: true,
        indexes: [
            {
                fields: ['businessId', 'period'],
                unique: true,
            },
        ],
    }
);

export default AttendanceLock;
