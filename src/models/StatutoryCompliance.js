import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const StatutoryCompliance = sequelize.define(
  'StatutoryCompliance',
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
    payrollRunId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'payroll_runs',
        key: 'id',
      },
    },
    periodMonth: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    periodYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    pfFiled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    pfFiledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    esiFiled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    esiFiledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ptFiled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ptFiledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    tdsDeposited: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    tdsDepositedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'statutory_compliance',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['businessId', 'payrollRunId'] },
      { fields: ['businessId', 'periodYear', 'periodMonth'] },
    ],
  }
);

export default StatutoryCompliance;
