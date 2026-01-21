// src/models/PayrollQuery.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const PayrollQuery = sequelize.define(
    'PayrollQuery',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'employees',
                key: 'id',
            },
        },
        businessId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'businesses',
                key: 'id',
            },
        },
        category: {
            type: DataTypes.ENUM('Salary Mismatch', 'Tax Deduction', 'Reimbursement', 'LOP/Attendance', 'Other'),
            allowNull: false,
        },
        subject: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('Pending', 'In Progress', 'Resolved', 'Closed'),
            defaultValue: 'Pending',
        },
        resolutionNotes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        resolvedBy: {
            type: DataTypes.INTEGER, // User ID
            allowNull: true,
        },
        resolvedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: 'payroll_queries',
        timestamps: true,
    }
);

export default PayrollQuery;
