import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";

const PayrollQuery = sequelize.define('PayrollQuery', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  businessId: { type: DataTypes.INTEGER, allowNull: false },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },

  payrollRunId: { type: DataTypes.INTEGER },

  subject: { type: DataTypes.STRING(120), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },

  status: {
    type: DataTypes.ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED'),
    defaultValue: 'OPEN',
  },

  resolvedBy: { type: DataTypes.INTEGER },
  resolvedAt: { type: DataTypes.DATE },

}, {
  tableName: 'payroll_queries',
  timestamps: true,
});

export default PayrollQuery;
