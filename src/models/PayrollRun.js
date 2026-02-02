import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const PayrollRun = sequelize.define(
  'PayrollRun',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    businessId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM('DRAFT', 'CALCULATED', 'APPROVED', 'LOCKED'),
      defaultValue: 'DRAFT',
    },

    period: {
      type: DataTypes.STRING(7), // YYYY-MM
      allowNull: false,
    },

    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    lockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'payroll_runs',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['businessId', 'period'],
      },
    ],
  }
);

export default PayrollRun;
