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
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        region: {
            type: DataTypes.STRING(120),
            allowNull: true, // Optional region/state
        },
    
    },
      
  
  {
    tableName: 'holidays',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['businessId'] },
      { unique: true, fields: ['businessId', 'date', 'name'] },
    ],
  }
);

export default Holiday;
