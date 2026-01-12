// src/models/LeaveBalance.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const LeaveBalance = sequelize.define('LeaveBalance', {
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
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'employees',
      key: 'id',
    },
  },
  leaveTypeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'leave_types',
      key: 'id',
    },
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: () => new Date().getFullYear(),
  },
  allocated: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total leaves allocated for the year',
  },
  used: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total leaves used (approved)',
  },
  pending: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Leaves in pending requests',
  },
  carriedForward: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Leaves carried from previous year',
  },
}, {
  tableName: 'leave_balances',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['businessId', 'employeeId', 'leaveTypeId', 'year'],
      name: 'unique_leave_balance_per_year',
    },
    { fields: ['businessId'] },
    { fields: ['employeeId'] },
    { fields: ['leaveTypeId'] },
  ],
});

// Virtual getter for available balance
LeaveBalance.prototype.getAvailable = function() {
  const allocated = parseFloat(this.allocated) || 0;
  const carriedForward = parseFloat(this.carriedForward) || 0;
  const used = parseFloat(this.used) || 0;
  const pending = parseFloat(this.pending) || 0;
  return allocated + carriedForward - used - pending;
};

export { LeaveBalance };
export default LeaveBalance;
