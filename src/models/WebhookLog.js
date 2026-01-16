// src/models/WebhookLog.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const WebhookLog = sequelize.define('WebhookLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  eventId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  eventType: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  provider: {
    type: DataTypes.STRING(50),
    defaultValue: 'razorpay'
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: true
  },
  processed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  error: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'webhook_logs',
  timestamps: true,
  indexes: [
    { fields: ['eventId'], unique: true },
    { fields: ['eventType'] },
    { fields: ['processed'] }
  ]
});

export { WebhookLog };
export default WebhookLog;
