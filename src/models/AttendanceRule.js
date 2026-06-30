import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const AttendanceRule = sequelize.define('AttendanceRule', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  businessId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  workWeekConfig: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: { type: 'MON_FRI', days: [1, 2, 3, 4, 5] },
  },
  defaultShiftId: { type: DataTypes.INTEGER, allowNull: true },
  gracePeriodMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
  halfDayThresholdHours: { type: DataTypes.DECIMAL(4, 2), allowNull: false, defaultValue: 4.0 },
  fullDayThresholdHours: { type: DataTypes.DECIMAL(4, 2), allowNull: false, defaultValue: 8.0 },
  autoAbsentEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  lateMarkAllowedCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
  overtimeEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  geoAttendanceEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  selfieAttendanceEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  regularizationAllowed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  attendanceLockDay: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'attendance_rules',
  timestamps: true,
});

export default AttendanceRule;
