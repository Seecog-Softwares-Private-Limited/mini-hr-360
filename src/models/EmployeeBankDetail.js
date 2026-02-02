// src/models/EmployeeBankDetail.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const EmployeeBankDetail = sequelize.define(
    'EmployeeBankDetail',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: {
                model: 'employees',
                key: 'id',
            },
        },
        bankName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        accountNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        accountHolderName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        ifscCode: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        branchName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        panNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        uanNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        esiNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        aadhaarNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        taxDeclarationStatus: {
            type: DataTypes.ENUM('Not Submitted', 'Submitted', 'Verified'),
            defaultValue: 'Not Submitted',
        },
        // RazorpayX integration fields
        razorpayContactId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        razorpayFundAccountId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        tableName: 'employee_bank_details',
        timestamps: true,
    }
);

export default EmployeeBankDetail;
