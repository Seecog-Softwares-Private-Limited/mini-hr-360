import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const EmployeeShiftAssignment = sequelize.define(
  'EmployeeShiftAssignment',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    businessId: { type: DataTypes.INTEGER, allowNull: false },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    policyId: { type: DataTypes.INTEGER, allowNull: false },
    shiftId: { type: DataTypes.INTEGER, allowNull: false },
    effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false },
    effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
    weekoffPatternJson: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
  },
  {
    tableName: 'employee_shift_assignments',
    timestamps: true,
    paranoid: true,
   indexes: [
  { name: 'idx_esa_biz', unique: true, fields: ['businessId'] },
  { name: 'idx_esa_emp', unique: true, fields: ['employeeId'] },
  { name: 'idx_esa_pol', unique: true, fields: ['policyId'] },
  { name: 'idx_esa_shf', unique: true, fields: ['shiftId'] },

  // ✅ this is the one causing the crash (too long auto-name)
  { name: 'idx_esa_emp_eff', fields: ['employeeId', 'effectiveFrom', 'effectiveTo'] },
],

  }
);

export default EmployeeShiftAssignment;
