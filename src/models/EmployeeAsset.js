import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const EmployeeAsset = sequelize.define(
  'EmployeeAsset',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    businessId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'businesses', key: 'id' },
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'employees', key: 'id' },
      onDelete: 'CASCADE',
    },
    assetType: {
      type: DataTypes.ENUM('Laptop', 'Mobile', 'Access Card', 'Monitor', 'Headset', 'Other'),
      allowNull: false,
      defaultValue: 'Laptop',
    },
    assetName: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    assetTag: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    brand: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    model: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    assignedDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    returnedDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Assigned', 'Returned', 'Lost', 'Damaged'),
      allowNull: false,
      defaultValue: 'Assigned',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    assignedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
  },
  {
    tableName: 'employee_assets',
    timestamps: true,
    indexes: [
      { fields: ['businessId'] },
      { fields: ['employeeId'] },
      { fields: ['status'] },
      { fields: ['assetTag'] },
    ],
  }
);

export default EmployeeAsset;
