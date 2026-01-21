// src/models/SalaryStructure.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const SalaryStructure = sequelize.define(
    'SalaryStructure',
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
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        // Components master (Earnings / Deductions)
        // Structure: { earnings: [{name: 'Basic', type: 'fixed/percent', value: 50, reference: 'CTC'}], deductions: [...] }
        components: {
            type: DataTypes.JSON,
            allowNull: false,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    },
    {
        tableName: 'salary_structures',
        timestamps: true,
    }
);

export default SalaryStructure;
