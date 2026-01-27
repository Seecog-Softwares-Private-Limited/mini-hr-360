import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";

const EmployeeSalaryAssignment = sequelize.define('EmployeeSalaryAssignment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  businessId: { type: DataTypes.INTEGER, allowNull: false },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },

  salaryStructureId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false },
  effectiveTo: { type: DataTypes.DATEONLY },

}, {
  tableName: 'employee_salary_assignments',
  timestamps: true,
});

export default EmployeeSalaryAssignment;
