import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const OrganizationSetupProgress = sequelize.define('OrganizationSetupProgress', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  businessId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  currentStep: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  completedSteps: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
  skippedSteps: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
  setupCompleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  completedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'organization_setup_progress',
  timestamps: true,
});

export default OrganizationSetupProgress;
