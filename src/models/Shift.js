
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const Shift = sequelize.define(
    'Shift',
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
        startTime: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        endTime: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        // breakRuleJson: fixed break mins or punch based
        breakRuleJson: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: {},
        },
        lateGraceMinutes: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    },
    {
        tableName: 'shifts',
        timestamps: true,
    }
);

export default Shift;
