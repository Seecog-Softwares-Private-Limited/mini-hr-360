import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js"; // ✅ from src/models -> ../db



const PayrollRun = sequelize.define('PayrollRun', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  businessId: { type: DataTypes.INTEGER, allowNull: false },

  period: { type: DataTypes.STRING(7), allowNull: false }, // YYYY-MM

  status: {
    type: DataTypes.ENUM(
      'DRAFT',
      'CALCULATED',
      'APPROVED',
      'LOCKED'
    ),
    defaultValue: 'DRAFT',
  },

  approvedBy: { type: DataTypes.INTEGER },
  approvedAt: { type: DataTypes.DATE },

  lockedAt: { type: DataTypes.DATE },

}, {
  tableName: 'payroll_runs',
  timestamps: true,
});

export default PayrollRun;
