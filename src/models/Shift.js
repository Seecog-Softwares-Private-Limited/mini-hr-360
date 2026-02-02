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
      type: DataTypes.STRING(120),
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
      allowNull: false,
      defaultValue: {},
    },

    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
  },
  {
    tableName: 'shifts',
    timestamps: true,
    paranoid: true,
    indexes: [{ fields: ['businessId'] }],
  }
);

export default Shift;







