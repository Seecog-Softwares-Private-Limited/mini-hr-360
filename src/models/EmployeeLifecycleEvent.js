import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const EmployeeLifecycleEvent = sequelize.define(
  'EmployeeLifecycleEvent',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fromStage: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    toStage: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    actorUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: 'employee_lifecycle_events',
    timestamps: true,
  }
);

export default EmployeeLifecycleEvent;
