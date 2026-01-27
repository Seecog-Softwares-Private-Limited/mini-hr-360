import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";

const SalaryStructure = sequelize.define('SalaryStructure', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  businessId: { type: DataTypes.INTEGER, allowNull: false },

  name: { type: DataTypes.STRING(80), allowNull: false }, // Developer SD1
  description: { type: DataTypes.TEXT },

  components: {
    type: DataTypes.JSON,
    allowNull: false, 
    // [{ componentId, value, rule }]
  },

  version: { type: DataTypes.INTEGER, defaultValue: 1 },

  status: {
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
    defaultValue: 'ACTIVE',
  },

}, {
  tableName: 'salary_structures',
  timestamps: true,
});

export default SalaryStructure;
