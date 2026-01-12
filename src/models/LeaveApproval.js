// src/models/LeaveApproval.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const LeaveApproval = sequelize.define('LeaveApproval', {
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
  leaveRequestId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'leave_requests',
      key: 'id',
    },
  },
  approverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    comment: 'User (admin/HR) who took the action',
  },
  action: {
    type: DataTypes.ENUM('APPROVED', 'REJECTED'),
    allowNull: false,
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Approval level (for multi-level approval workflows)',
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  actionAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'leave_approvals',
  timestamps: true,
  indexes: [
    { fields: ['businessId'] },
    { fields: ['leaveRequestId'] },
    { fields: ['approverId'] },
  ],
});

export { LeaveApproval };
export default LeaveApproval;
