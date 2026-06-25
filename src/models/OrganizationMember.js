import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const OrganizationMember = sequelize.define('OrganizationMember', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  businessId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'businesses', key: 'id' },
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'member',
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active',
  },
}, {
  tableName: 'organization_members',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['userId', 'businessId'], name: 'uniq_org_member_user_business' },
    { fields: ['businessId'], name: 'idx_org_member_business' },
  ],
});

export { OrganizationMember };
