// src/models/UserExperience.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const UserExperience = sequelize.define(
    'UserExperience',
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
        organizationName: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        jobTitle: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        startDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        endDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        isCurrent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        location: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        industry: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        keyResponsibilities: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        reasonForLeaving: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        lastDrawnSalary: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
        },
    },
    {
        tableName: 'user_experiences',
        timestamps: true,
    }
);

export default UserExperience;
