/**
 * VariablePayDefinition Model
 * Variable pay components (bonuses, incentives)
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const VariablePayDefinition = sequelize.define(
  'VariablePayDefinition',
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
    variableType: {
      type: DataTypes.ENUM('performance_bonus', 'joining_bonus', 'retention_bonus', 'quarterly_incentive', 'custom'),
      allowNull: false,
      field: 'variable_type',
    },
    payoutFrequency: {
      type: DataTypes.ENUM('monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time'),
      allowNull: false,
      field: 'payout_frequency',
    },
    calculationBasis: {
      type: DataTypes.ENUM('percent_of_ctc', 'percent_of_basic', 'percent_of_gross', 'fixed_amount', 'formula'),
      allowNull: false,
      field: 'calculation_basis',
    },
    value: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    formulaExpression: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'formula_expression',
    },
    isTaxable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_taxable',
    },
    linkedToCycle: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'linked_to_cycle',
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
  },
  {
    tableName: 'variable_pay_definitions',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['employee_id', 'is_active'],
      },
    ],
  }
);

export default VariablePayDefinition;
