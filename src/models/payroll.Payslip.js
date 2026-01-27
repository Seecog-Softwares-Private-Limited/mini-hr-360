import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";

const Payslip = sequelize.define('Payslip', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  payrollRunId: { type: DataTypes.INTEGER, allowNull: false },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },

  month: { type: DataTypes.STRING(7), allowNull: false },

  pdfPath: { type: DataTypes.STRING },

  status: {
    type: DataTypes.ENUM('GENERATED', 'PUBLISHED', 'HELD'),
    defaultValue: 'GENERATED',
  },

  publishedAt: { type: DataTypes.DATE },

}, {
  tableName: 'payslips',
  timestamps: true,
});

export default Payslip;
