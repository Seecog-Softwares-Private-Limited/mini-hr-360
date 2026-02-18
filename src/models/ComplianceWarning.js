/**
 * ComplianceWarning Model
 * Tracks compliance warnings and alerts
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const ComplianceWarning = sequelize.define(
  'ComplianceWarning',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'employee_id',
      references: {
        model: 'employees',
        key: 'id',
      },
    },
    templateId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'template_id',
      references: {
        model: 'salary_templates',
        key: 'id',
      },
    },
    warningType: {
      type: DataTypes.ENUM('basic_percentage', 'pf_misconfiguration', 'esi_threshold', 'statutory_missing', 'formula_error', 'circular_dependency', 'ctc_balance'),
      allowNull: false,
      field: 'warning_type',
    },
    severity: {
      type: DataTypes.ENUM('info', 'warning', 'error'),
      allowNull: false,
      defaultValue: 'warning',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    componentCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'component_code',
    },
    isResolved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_resolved',
    },
    resolvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'resolved_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'resolved_at',
    },
  },
  {
    tableName: 'compliance_warnings',
    timestamps: true,
    underscored: true,
    updatedAt: false,
    indexes: [
      {
        fields: ['employee_id', 'is_resolved'],
      },
      {
        fields: ['template_id', 'is_resolved'],
      },
    ],
  }
);

export default ComplianceWarning;
