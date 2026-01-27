import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const EmployeeShiftAssignment = sequelize.define(
    'EmployeeShiftAssignment',
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
            onDelete: 'CASCADE',
        },
        policyId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'attendance_policies',
                key: 'id',
            },
            
        },
        shiftId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'shifts',
                key: 'id',
            },
            
        },
        effectiveFrom: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        effectiveTo: {
            type: DataTypes.DATEONLY,
            allowNull: true, // Null means indefinitely
        },
        // weekoffPatternJson: e.g. { "Monday": false, "Saturday": "alternate" } or simply array of days [0, 6]
        weekoffPatternJson: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: {},
        },
       
    
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
  {  fields: ['businessId'] },
  {  fields: ['employeeId'] },
  {  fields: ['policyId'] },
  {  fields: ['shiftId'] },

  // ✅ this is the one causing the crash (too long auto-name)
  { name: 'idx_esa_emp_eff', fields: ['employeeId', 'effectiveFrom', 'effectiveTo'] },
],

  }
);

export default EmployeeShiftAssignment;
