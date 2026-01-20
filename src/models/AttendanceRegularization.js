import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const AttendanceRegularization = sequelize.define(
  'AttendanceRegularization',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    businessId: { type: DataTypes.INTEGER, allowNull: false },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    type: {
      type: DataTypes.ENUM('MISSED_PUNCH', 'LATE', 'EARLY_OUT', 'ABSENT'),
      allowNull: false,
    },
    requestedChangeJson: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
    reason: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    actionByUserId: { type: DataTypes.INTEGER, allowNull: true },
    actionNote: { type: DataTypes.TEXT, allowNull: true },
    actionAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'attendance_regularizations',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['businessId'] },
      { fields: ['employeeId'] },
      { fields: ['date'] },
      { fields: ['status'] },
      { fields: ['businessId', 'status'] },
    ],
  }
);

export default AttendanceRegularization;
