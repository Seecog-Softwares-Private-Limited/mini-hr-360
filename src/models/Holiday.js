
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const Holiday = sequelize.define(
    'Holiday',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        businessId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'businesses',
                key: 'id',
            },
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        region: {
            type: DataTypes.STRING(100),
            allowNull: true, // Optional region/state
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    },
    {
        tableName: 'holidays',
        timestamps: true,
    }
);

export default Holiday;
