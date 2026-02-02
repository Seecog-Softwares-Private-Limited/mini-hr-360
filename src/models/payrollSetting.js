import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const PayrollSetting = sequelize.define('PayrollSetting', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

  businessId: { type: DataTypes.INTEGER, allowNull: false },

  payFrequency: {
    type: DataTypes.ENUM('MONTHLY', 'WEEKLY'),
    defaultValue: 'MONTHLY',
  },

  payDay: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    defaultValue: 25,
  }, // e.g. 25
  
  cutoffDay: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    defaultValue: 20,
  }, // e.g. 20

  financialYearStart: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'APR',
    comment: 'Financial year start month code e.g., APR, JAN, JUL'
  },

  proration: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Enable proration for mid-month join/exit'
  },

  statutoryConfig: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}, // PF, ESI, PT, TDS toggles
  },

  bankDetails: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
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
