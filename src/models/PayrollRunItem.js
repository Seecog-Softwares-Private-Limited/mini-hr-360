import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";

const PayrollRunItem = sequelize.define('PayrollRunItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  payrollRunId: { type: DataTypes.INTEGER, allowNull: false },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },

  earnings: { type: DataTypes.JSON, allowNull: false },
  deductions: { type: DataTypes.JSON, allowNull: false },

  grossPay: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  totalDeductions: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  netPay: { type: DataTypes.DECIMAL(12,2), allowNull: false },

  lopDays: { type: DataTypes.INTEGER, defaultValue: 0 },

}, {
  tableName: 'payroll_run_items',
  timestamps: true,
});

export default PayrollRunItem;
