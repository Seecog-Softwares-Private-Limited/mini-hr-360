// src/models/PayrollRun.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const PayrollRun = sequelize.define(
    'PayrollRun',
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
        periodMonth: {
            type: DataTypes.INTEGER, // 1-12
            allowNull: false,
        },
        periodYear: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('Draft', 'Processing', 'Pending Approval', 'Approved', 'Locked', 'Paid'),
            defaultValue: 'Draft',
        },
        processedDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        totalEarnings: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
        },
        totalDeductions: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
        },
        totalNetPay: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
        },
        employeeCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        // Payment processing fields
        paymentStatus: {
            type: DataTypes.ENUM('pending', 'initiated', 'partial', 'completed', 'failed'),
            defaultValue: 'pending',
        },
        paymentInitiatedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        paymentCompletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        paymentSummary: {
            type: DataTypes.JSON,
            allowNull: true,
        },
    },
    {
        tableName: 'payroll_runs',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['businessId', 'periodMonth', 'periodYear'] }
        ]
    }
);

export default PayrollRun;
