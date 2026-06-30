import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const BranchLocation = sequelize.define('BranchLocation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  businessId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(150), allowNull: false },
  code: { type: DataTypes.STRING(32), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  city: { type: DataTypes.STRING(100), allowNull: true },
  state: { type: DataTypes.STRING(100), allowNull: true },
  country: { type: DataTypes.STRING(100), allowNull: true },
  pincode: { type: DataTypes.STRING(10), allowNull: true },
  locationType: {
    type: DataTypes.ENUM('HEAD_OFFICE', 'BRANCH', 'REMOTE', 'CLIENT_SITE'),
    allowNull: false,
    defaultValue: 'BRANCH',
  },
  isPrimary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
  longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
  geoFenceRadiusMeters: { type: DataTypes.INTEGER, allowNull: true },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
    allowNull: false,
    defaultValue: 'ACTIVE',
  },
}, {
  tableName: 'branch_locations',
  timestamps: true,
});

export default BranchLocation;
