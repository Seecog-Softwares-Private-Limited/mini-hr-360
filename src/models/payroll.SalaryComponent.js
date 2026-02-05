import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";

const SalaryComponent = sequelize.define('SalaryComponent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  businessId: { type: DataTypes.INTEGER, allowNull: false },

  name: { type: DataTypes.STRING(64), allowNull: false }, // Basic, HRA
  code: { type: DataTypes.STRING(32), allowNull: false },

  type: {
    type: DataTypes.ENUM('EARNING', 'DEDUCTION'),
    allowNull: false,
  },

  calculationType: {
    type: DataTypes.ENUM('FIXED', 'PERCENTAGE', 'FORMULA'),
    allowNull: false,
  },

  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
  },

  isTaxable: { type: DataTypes.BOOLEAN, defaultValue: false },
  isStatutory: { type: DataTypes.BOOLEAN, defaultValue: false },

}, {
  tableName: 'salary_components',
  timestamps: true,
});

export default SalaryComponent;
