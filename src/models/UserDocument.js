// src/models/UserDocument.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const UserDocument = sequelize.define(
    'UserDocument',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        documentType: {
            type: DataTypes.STRING(100),
            allowNull: false, // Aadhaar, PAN, Passport, Experience Letter, etc.
        },
        documentNumber: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        category: {
            type: DataTypes.ENUM('Identity', 'Address', 'Education', 'Experience', 'Other'),
            allowNull: true,
        },
        fileUrl: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        issueDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        expiryDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        issuingAuthority: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        verificationStatus: {
            type: DataTypes.ENUM('Pending', 'Verified', 'Rejected'),
            defaultValue: 'Pending',
        },
        verifiedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        verifiedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        tableName: 'user_documents',
        timestamps: true,
    }
);

export default UserDocument;
