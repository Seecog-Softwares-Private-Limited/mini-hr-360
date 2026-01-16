// src/models/Plan.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const Plan = sequelize.define('Plan', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Price in rupees'
  },
  amountPaise: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Price in paise for Razorpay'
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'INR'
  },
  interval: {
    type: DataTypes.STRING(20),
    defaultValue: 'month',
    comment: 'Billing interval: month, year, etc.'
  },
  intervalCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Number of intervals between billings'
  },
  features: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of feature strings'
  },
  maxEmployees: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Maximum employees allowed in this plan'
  },
  providerPlanId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Razorpay plan ID'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'plans',
  timestamps: true
});

export { Plan };
export default Plan;
