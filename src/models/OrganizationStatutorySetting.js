import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const OrganizationStatutorySetting = sequelize.define('OrganizationStatutorySetting', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  businessId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  pfEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  pfEstablishmentNumber: { type: DataTypes.STRING(50), allowNull: true },
  employeePfRate: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 12.0 },
  employerPfRate: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 12.0 },
  esiEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  esiEmployerCode: { type: DataTypes.STRING(50), allowNull: true },
  ptEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  ptState: { type: DataTypes.STRING(100), allowNull: true },
  tdsEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  tanNumber: { type: DataTypes.STRING(10), allowNull: true },
  payrollBankAccountName: { type: DataTypes.STRING(150), allowNull: true },
  payrollBankAccountNumber: { type: DataTypes.STRING(30), allowNull: true },
  payrollBankIfsc: { type: DataTypes.STRING(15), allowNull: true },
  payrollBankName: { type: DataTypes.STRING(150), allowNull: true },
  payrollBankBranch: { type: DataTypes.STRING(150), allowNull: true },
}, {
  tableName: 'organization_statutory_settings',
  timestamps: true,
});

export default OrganizationStatutorySetting;
