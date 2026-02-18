/**
 * StateTaxSlab Model
 * Professional tax slabs for different states
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const StateTaxSlab = sequelize.define(
  'StateTaxSlab',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    incomeMin: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'income_min',
    },
    incomeMax: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: 'income_max',
    },
    taxAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'tax_amount',
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
    tableName: 'state_tax_slabs',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['state', 'income_min', 'income_max'],
      },
    ],
  }
);

export default StateTaxSlab;
