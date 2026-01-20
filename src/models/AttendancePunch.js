import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const AttendancePunch = sequelize.define(
  'AttendancePunch',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    businessId: { type: DataTypes.INTEGER, allowNull: false },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    punchType: {
      type: DataTypes.ENUM('IN', 'OUT', 'BREAK_START', 'BREAK_END'),
      allowNull: false,
    },
    punchAt: { type: DataTypes.DATE, allowNull: false },
    source: {
      type: DataTypes.ENUM('WEB', 'MOBILE', 'MANUAL', 'REGULARIZED'),
      allowNull: false,
      defaultValue: 'WEB',
    },
    metaJson: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
  },
  {
    tableName: 'attendance_punches',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['businessId'] },
      { fields: ['employeeId'] },
      { fields: ['date'] },
      { fields: ['employeeId', 'date'] },
    ],
  }
);

export default AttendancePunch;
