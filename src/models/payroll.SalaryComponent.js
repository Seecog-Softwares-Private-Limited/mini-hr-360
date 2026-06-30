import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";

const SalaryComponent = sequelize.define('SalaryComponent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  businessId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(64), allowNull: false },
  code: { type: DataTypes.STRING(32), allowNull: false },
  type: {
    type: DataTypes.ENUM('EARNING', 'DEDUCTION'),
    allowNull: false,
  },
  componentType: {
    type: DataTypes.ENUM('earning', 'deduction', 'employer_contribution', 'reimbursement'),
    allowNull: true,
  },
  calculationType: {
    type: DataTypes.ENUM('FIXED', 'PERCENTAGE', 'FORMULA'),
    allowNull: false,
  },
  value: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  formula: { type: DataTypes.TEXT, allowNull: true },
  metadata: { type: DataTypes.JSON, defaultValue: {} },
  isTaxable: { type: DataTypes.BOOLEAN, defaultValue: false },
  isStatutory: { type: DataTypes.BOOLEAN, defaultValue: false },
  showInPayslip: { type: DataTypes.BOOLEAN, defaultValue: true },
  isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active',
  },
}, {
  tableName: 'salary_components',
  timestamps: true,
});

export default SalaryComponent;
