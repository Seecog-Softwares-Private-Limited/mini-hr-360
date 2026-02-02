// src/models/DocumentType.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const DocumentType = sequelize.define(
    'DocumentType',
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING(150),
            allowNull: false,
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        icon: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        templateHtml: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        isDeleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: 'document_types',
        timestamps: true, // createdAt, updatedAt
        paranoid: false,  // we manage isDeleted + deletedAt manually
        indexes: [
            { name: 'idx_document_types_code', unique: true, fields: ['code'] },
            { name: 'idx_document_types_isDeleted', fields: ['isDeleted'] },
        ],
    }
);

export default DocumentType;
