// src/models/Invoice.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoiceNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  subscriptionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'subscriptions',
      key: 'id'
    }
  },
  businessId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'INR'
  },
  status: {
    type: DataTypes.ENUM('draft', 'issued', 'paid', 'failed', 'refunded', 'cancelled'),
    defaultValue: 'issued'
  },
  razorpayPaymentId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  razorpayInvoiceId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  razorpayOrderId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  paymentMethod: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'card, upi, netbanking, etc.'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  issuedDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  paidDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  failedDate: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'invoices',
  timestamps: true,
  indexes: [
    { fields: ['subscriptionId'] },
    { fields: ['businessId'] },
    { fields: ['status'] },
    { fields: ['invoiceNumber'], unique: true }
  ]
});

export { Invoice };
export default Invoice;
