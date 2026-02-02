// src/models/PayrollSetup.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const PayrollSetup = sequelize.define(
    'PayrollSetup',
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
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        payCalendar: {
            type: DataTypes.ENUM('Monthly', 'Weekly', 'Bi-Weekly'),
            defaultValue: 'Monthly',
        },
        payDate: {
            type: DataTypes.INTEGER, // Day of month (1-31)
            allowNull: true,
        },
        cutoffDate: {
            type: DataTypes.INTEGER, // Day of month (1-31)
            allowNull: true,
        },
        prorationOnJoin: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        prorationOnExit: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        // Statutory Toggles
        enablePF: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        enableESI: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        enablePT: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        enableTDS: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        // Rules / Settings (JSON for flexibility)
        statutoryRules: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        payoutSettings: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        payslipTemplate: {
            type: DataTypes.STRING,
            defaultValue: 'default',
        },
    },
    {
        tableName: 'payroll_setups',
        timestamps: true,
    }
);

export default PayrollSetup;
