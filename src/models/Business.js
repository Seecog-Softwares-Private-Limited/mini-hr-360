import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const Business = sequelize.define('Business', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  businessName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phoneNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  whatsappNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  timezone: {
    type: DataTypes.STRING,
    defaultValue: 'Asia/Kolkata'
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true
  },
  inviteCode: {
    type: DataTypes.STRING(16),
    allowNull: true,
    unique: true
  },
  legalName: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  displayName: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  gstNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  panNumber: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  tanNumber: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  pincode: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  logoUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  financialYearStartMonth: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 4,
  },
}, {
  tableName: 'businesses',
  timestamps: true
});

export { Business };