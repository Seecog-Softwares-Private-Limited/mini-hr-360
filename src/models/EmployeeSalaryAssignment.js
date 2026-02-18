/**
 * EmployeeSalaryAssignment Model
 * Links employees to salary templates with effective dates
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const EmployeeSalaryAssignment = sequelize.define(
  'EmployeeSalaryAssignment',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'employee_id',
      references: {
        model: 'employees',
        key: 'id',
      },
    },
    templateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'template_id',
      references: {
        model: 'salary_templates',
        key: 'id',
      },
    },
    ctcAnnual: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'ctc_annual',
    },
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'effective_from',
    },
    effectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'effective_to',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    calculatedComponents: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'calculated_components',
    },
    employerCostTotal: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: 'employer_cost_total',
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    tableName: 'employee_salary_assignments',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['employee_id', 'effective_from'],
      },
      {
        fields: ['employee_id', 'is_active'],
      },
    ],
  }
);

export default EmployeeSalaryAssignment;
