import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  businessId: { type: DataTypes.INTEGER, allowNull: true },
  action: { type: DataTypes.STRING(80), allowNull: false },
  module: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'setup' },
  oldValue: { type: DataTypes.JSON, allowNull: true },
  newValue: { type: DataTypes.JSON, allowNull: true },
  ipAddress: { type: DataTypes.STRING(45), allowNull: true },
}, {
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false,
});

export default AuditLog;
