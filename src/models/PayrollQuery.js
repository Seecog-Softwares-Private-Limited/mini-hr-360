import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const PayrollQuery = sequelize.define(
  'PayrollQuery',
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
    },

    category: {
      type: DataTypes.ENUM(
        'Salary Mismatch',
        'Tax Deduction',
        'Reimbursement',
        'LOP/Attendance',
        'Other'
      ),
      allowNull: false,
    },

    subject: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM('Pending', 'In Progress', 'Resolved', 'Closed'),
      allowNull: false,
      defaultValue: 'Pending',
    },

    resolutionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    resolvedBy: {
      type: DataTypes.INTEGER, // User ID
      allowNull: true,
    },

    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'payroll_queries',
    timestamps: true,
  }
);

export default PayrollQuery;
