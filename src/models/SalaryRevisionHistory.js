/**
 * SalaryRevisionHistory Model
 * Audit trail for salary changes
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const SalaryRevisionHistory = sequelize.define(
  'SalaryRevisionHistory',
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
    assignmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'assignment_id',
      references: {
        model: 'employee_salary_assignments',
        key: 'id',
      },
    },
    revisionType: {
      type: DataTypes.ENUM('ctc_change', 'template_change', 'component_override', 'promotion'),
      allowNull: false,
      field: 'revision_type',
    },
    oldCtc: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: 'old_ctc',
    },
    newCtc: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'new_ctc',
    },
    oldComponents: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'old_components',
    },
    newComponents: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'new_components',
    },
    changedComponents: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'changed_components',
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'effective_from',
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    tableName: 'salary_revision_history',
    timestamps: true,
    underscored: true,
    updatedAt: false, // Only created_at, no updated_at for audit trail
    indexes: [
      {
        fields: ['employee_id', 'created_at'],
      },
    ],
  }
);

export default SalaryRevisionHistory;
