import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const OTP = sequelize.define(
    'OTP',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        identifier: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Email or Phone number used to identify the user'
        },
        otp: {
            type: DataTypes.STRING,
            allowNull: false
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('login', 'register'),
            allowNull: false
        },
        metadata: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'JSON string for registration data'
        }
    },
    {
        tableName: 'otps',
        timestamps: true
    }
);

export { OTP };
