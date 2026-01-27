import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const PayrollSetting = sequelize.define('PayrollSetting', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

  businessId: { type: DataTypes.INTEGER, allowNull: false },

  payFrequency: {
    type: DataTypes.ENUM('MONTHLY', 'WEEKLY'),
    defaultValue: 'MONTHLY',
  },

  payDay: { type: DataTypes.INTEGER, allowNull: false }, // e.g. 30
  cutoffDay: { type: DataTypes.INTEGER, allowNull: false }, // e.g. 25

  statutoryConfig: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}, // PF, ESI, PT, TDS toggles
  },

  approvalWorkflow: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}, // HR → Finance → Admin
  },

}, {
  tableName: 'payroll_settings',
  timestamps: true,
});


export default PayrollSetting;
