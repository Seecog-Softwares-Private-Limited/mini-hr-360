// src/models/Payslip.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const Payslip = sequelize.define(
    'Payslip',
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
        payrollRunId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'payroll_runs',
                key: 'id',
            },
        },
        periodMonth: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        periodYear: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        earnings: {
            type: DataTypes.JSON,
            allowNull: false,
        },
        deductions: {
            type: DataTypes.JSON,
            allowNull: false,
        },
        netPay: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('Published', 'Held'),
            defaultValue: 'Published',
        },
        pdfUrl: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        publishedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: 'payslips',
        timestamps: true,
    }
);

export default Payslip;
