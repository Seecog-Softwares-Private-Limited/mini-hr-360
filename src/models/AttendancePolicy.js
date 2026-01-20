import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const AttendancePolicy = sequelize.define(
  'AttendancePolicy',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    businessId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(120), allowNull: false },
    rulesJson: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
  },
  {
    tableName: 'attendance_policies',
    timestamps: true,
    paranoid: true,
    indexes: [{ fields: ['businessId'] }],
  }
);

export default AttendancePolicy;
