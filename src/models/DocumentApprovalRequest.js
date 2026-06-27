import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const DocumentApprovalRequest = sequelize.define(
  'DocumentApprovalRequest',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    businessId: { type: DataTypes.INTEGER, allowNull: false },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    documentTypeId: { type: DataTypes.INTEGER, allowNull: true },
    code: { type: DataTypes.STRING(50), allowNull: false },
    fileName: { type: DataTypes.STRING(255), allowNull: false },
    filePath: { type: DataTypes.STRING(500), allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
    },
    requestedByUserId: { type: DataTypes.INTEGER, allowNull: true },
    reviewedByUserId: { type: DataTypes.INTEGER, allowNull: true },
    reviewNote: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
  },
  { tableName: 'document_approval_requests', timestamps: true }
);

export default DocumentApprovalRequest;
