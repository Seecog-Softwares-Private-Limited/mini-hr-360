// src/models/EmployeeSalaryStructure.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const EmployeeSalaryStructure = sequelize.define(
    'EmployeeSalaryStructure',
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
        salaryStructureId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'salary_structures',
                key: 'id',
            },
        },
        effectiveDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        ctc: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        // Specific overrides or computed breakup for this employee
        breakup: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    },
    {
        tableName: 'employee_salary_structures',
        timestamps: true,
    }
);

export default EmployeeSalaryStructure;
