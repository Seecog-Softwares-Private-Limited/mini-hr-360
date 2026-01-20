
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const EmployeeShiftAssignment = sequelize.define(
    'EmployeeShiftAssignment',
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
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'employees',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        policyId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'attendance_policies',
                key: 'id',
            },
            onDelete: 'SET NULL',
        },
        shiftId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'shifts',
                key: 'id',
            },
            onDelete: 'SET NULL',
        },
        effectiveFrom: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        effectiveTo: {
            type: DataTypes.DATEONLY,
            allowNull: true, // Null means indefinitely
        },
        // weekoffPatternJson: e.g. { "Monday": false, "Saturday": "alternate" } or simply array of days [0, 6]
        weekoffPatternJson: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: {},
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    },
    {
        tableName: 'employee_shift_assignments',
        timestamps: true,
    }
);

export default EmployeeShiftAssignment;
