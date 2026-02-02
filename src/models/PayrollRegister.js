// src/models/PayrollRegister.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const PayrollRegister = sequelize.define(
    'PayrollRegister',
    {
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
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'employees',
                key: 'id',
            },
        },
        // Detailed breakup for this register entry
        earnings: {
            type: DataTypes.JSON,
            allowNull: false,
        },
        deductions: {
            type: DataTypes.JSON,
            allowNull: false,
        },
        grossSalary: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        totalDeductions: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        netSalary: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        lopDays: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0,
        },
        arrears: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
        },
        reimbursements: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'Processed',
        }
    },
    {
        tableName: 'payroll_registers',
        timestamps: true,
    }
);

export default PayrollRegister;
