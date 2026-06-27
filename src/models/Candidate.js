import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const Candidate = sequelize.define(
  'Candidate',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    businessId: { type: DataTypes.INTEGER, allowNull: false },
    firstName: { type: DataTypes.STRING(100), allowNull: false },
    lastName: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    employeeType: {
      type: DataTypes.ENUM('Permanent', 'Contract', 'Intern', 'Consultant', 'Trainee'),
      defaultValue: 'Permanent',
    },
    designation: { type: DataTypes.STRING(255), allowNull: true },
    department: { type: DataTypes.STRING(255), allowNull: true },
    expectedCtc: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    internStipend: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    tentativeJoiningDate: { type: DataTypes.DATEONLY, allowNull: true },
    workLocation: { type: DataTypes.STRING(255), allowNull: true },
    source: { type: DataTypes.STRING(100), allowNull: true },
    status: {
      type: DataTypes.ENUM(
        'prospect',
        'offer_pending',
        'offer_sent',
        'accepted',
        'rejected',
        'converted'
      ),
      defaultValue: 'prospect',
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    convertedEmployeeId: { type: DataTypes.INTEGER, allowNull: true },
    createdByUserId: { type: DataTypes.INTEGER, allowNull: true },
  },
  { tableName: 'candidates', timestamps: true }
);

export default Candidate;
