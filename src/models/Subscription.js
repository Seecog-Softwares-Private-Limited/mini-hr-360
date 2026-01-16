// src/models/Subscription.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  businessId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'id'
    }
  },
  planId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'plans',
      key: 'id'
    }
  },
  planCode: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  razorpaySubscriptionId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  razorpayOrderId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  razorpayPaymentId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  razorpayCustomerId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  customerName: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  customerEmail: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  customerContact: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'past_due', 'cancelled', 'expired', 'trialing'),
    defaultValue: 'pending'
  },
  totalCount: {
    type: DataTypes.INTEGER,
    defaultValue: 12,
    comment: 'Total billing cycles'
  },
  billedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  currentPeriodStart: {
    type: DataTypes.DATE,
    allowNull: true
  },
  currentPeriodEnd: {
    type: DataTypes.DATE,
    allowNull: true
  },
  nextBillingDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelAtPeriodEnd: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  trialEndsAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'subscriptions',
  timestamps: true,
  indexes: [
    { fields: ['businessId'] },
    { fields: ['status'] },
    { fields: ['razorpayOrderId'] },
    { fields: ['razorpaySubscriptionId'] }
  ]
});

export { Subscription };
export default Subscription;
