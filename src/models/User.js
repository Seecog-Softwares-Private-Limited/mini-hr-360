import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';
import bcrypt from 'bcrypt';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  avatarUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phoneNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'shop_owner', 'shop_manager', 'shop_worker', 'SUPER_ADMIN', 'HR_MANAGER', 'HR_EXECUTIVE', 'FINANCE', 'MANAGER', 'EMPLOYEE'),
    defaultValue: 'shop_owner'
  },
  status: {
    type: DataTypes.ENUM('active', 'invited', 'disabled'),
    defaultValue: 'active'
  },
  refreshTokens: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  refreshTokenExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  middleName: { type: DataTypes.STRING(100), allowNull: true },
  gender: { type: DataTypes.ENUM('Male', 'Female', 'Non-binary', 'Prefer not to say'), allowNull: true },
  maritalStatus: { type: DataTypes.ENUM('Single', 'Married', 'Other'), allowNull: true },
  bloodGroup: { type: DataTypes.STRING(10), allowNull: true },
  nationality: { type: DataTypes.STRING(100), allowNull: true },
  religion: { type: DataTypes.STRING(100), allowNull: true },
  casteCategory: { type: DataTypes.STRING(100), allowNull: true },
  languagesKnown: { type: DataTypes.TEXT, allowNull: true },
  altPhone: { type: DataTypes.STRING(10), allowNull: true },
  dob: { type: DataTypes.DATEONLY, allowNull: true },
  emergencyContactName: { type: DataTypes.STRING(255), allowNull: true },
  emergencyContactRelation: { type: DataTypes.STRING(100), allowNull: true },
  emergencyContactNumber: { type: DataTypes.STRING(10), allowNull: true },
  presentAddressLine1: { type: DataTypes.STRING(255), allowNull: true },
  presentAddressLine2: { type: DataTypes.STRING(255), allowNull: true },
  presentCity: { type: DataTypes.STRING(100), allowNull: true },
  presentState: { type: DataTypes.STRING(100), allowNull: true },
  presentZip: { type: DataTypes.STRING(20), allowNull: true },
  presentCountry: { type: DataTypes.STRING(100), allowNull: true },
  permanentAddressLine1: { type: DataTypes.STRING(255), allowNull: true },
  permanentAddressLine2: { type: DataTypes.STRING(255), allowNull: true },
  permanentCity: { type: DataTypes.STRING(100), allowNull: true },
  permanentState: { type: DataTypes.STRING(100), allowNull: true },
  permanentZip: { type: DataTypes.STRING(20), allowNull: true },
  permanentCountry: { type: DataTypes.STRING(100), allowNull: true },
  employeeId: { type: DataTypes.STRING(50), allowNull: true },
  employeeType: { type: DataTypes.ENUM('Permanent', 'Contract', 'Intern', 'Consultant', 'Trainee'), defaultValue: 'Permanent' },
  designation: { type: DataTypes.STRING(255), allowNull: true },
  department: { type: DataTypes.STRING(255), allowNull: true },
  division: { type: DataTypes.STRING(255), allowNull: true },
  subDepartment: { type: DataTypes.STRING(255), allowNull: true },
  gradeBandLevel: { type: DataTypes.STRING(100), allowNull: true },
  workLoc: { type: DataTypes.STRING(255), allowNull: true },
  dateOfJoining: { type: DataTypes.DATEONLY, allowNull: true },
  probationPeriodMonths: { type: DataTypes.INTEGER, allowNull: true },
  confirmationDate: { type: DataTypes.DATEONLY, allowNull: true },
  employmentStatus: { type: DataTypes.ENUM('Active', 'On Leave', 'Resigned', 'Terminated', 'Retired'), defaultValue: 'Active' },
  workMode: { type: DataTypes.ENUM('On-site', 'Hybrid', 'Remote'), defaultValue: 'On-site' },
  ctc: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  overtimeEligible: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [
    { name: 'idx_users_email', unique: true, fields: ['email'] }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

// Instance method
User.prototype.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

export { User };