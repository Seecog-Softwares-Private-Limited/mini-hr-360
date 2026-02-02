import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const AttendanceDailySummary = sequelize.define(
  'AttendanceDailySummary',
  {
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
      onDelete: 'CASCADE',
    },

    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    firstInAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    lastOutAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    workMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    breakMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    lateMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    earlyMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    overtimeMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    status: {
      type: DataTypes.ENUM(
        'PRESENT',
        'ABSENT',
        'HALF_DAY',
        'LEAVE',
        'HOLIDAY',
        'WEEKOFF',
        'NOT_MARKED'
      ),
      allowNull: false,
      defaultValue: 'ABSENT',
    },

    source: {
      type: DataTypes.ENUM('AUTO', 'MANUAL', 'REGULARIZED'),
      allowNull: false,
      defaultValue: 'AUTO',
    },

    locked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'attendance_daily_summaries',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['businessId'] },
      { fields: ['employeeId'] },
      { fields: ['date'] },
      { unique: true, fields: ['businessId', 'employeeId', 'date'] },
      { fields: ['businessId', 'date'] },
    ],
  }
);

export default AttendanceDailySummary;