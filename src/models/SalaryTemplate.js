/**
 * SalaryTemplate Model
 * Enterprise-grade salary structure template
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const SalaryTemplate = sequelize.define(
  'SalaryTemplate',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
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
    autoBalanceSpecialAllowance: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'auto_balance_special_allowance',
    },
    applicableToGrade: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'applicable_to_grade',
    },
    applicableToDepartment: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'applicable_to_department',
    },
    applicableToDesignation: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'applicable_to_designation',
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'created_by',
    },
    // HRA Configuration
    hraMetroPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 50.00,
      field: 'hra_metro_percent',
    },
    hraNonMetroPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 40.00,
      field: 'hra_non_metro_percent',
    },
    // CTC Mode Configuration
    includeEmployerInCTC: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'include_employer_in_ctc',
    },
    // PF Configuration
    pfCapAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 1800.00,
      field: 'pf_cap_amount',
    },
    pfCapThreshold: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 15000.00,
      field: 'pf_cap_threshold',
    },
    // ESI Configuration
    esiThreshold: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 21000.00,
      field: 'esi_threshold',
    },
    // Gratuity Configuration
    gratuityRate: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      defaultValue: 0.0481,
      field: 'gratuity_rate',
    },
    includeGratuityInCTC: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'include_gratuity_in_ctc',
    },
    // Metro Cities
    metroCities: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'metro_cities',
      defaultValue: ['Mumbai', 'Delhi', 'Kolkata', 'Chennai', 'Bangalore', 'Hyderabad', 'Pune'],
    },
  },
  {
    tableName: 'salary_templates',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['name', 'version'],
      },
      {
        fields: ['is_active', 'effective_from', 'effective_to'],
      },
    ],
  }
);

export default SalaryTemplate;
