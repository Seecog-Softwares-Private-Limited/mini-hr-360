import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';
import bcrypt from 'bcrypt';

const User = sequelize.define(
  'User',
  {
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
      unique: true,
      validate: {
        isEmail: true
      }
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false
    },

    // ✅ FIXED: NO ENUM (prevents DB crashes)
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'shop_owner'
    },

    // ✅ FIXED: NO ENUM
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active'
    },

    refreshTokens: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    refreshTokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: 'users',
    timestamps: true,
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
  }
);

// ✅ Instance method
User.prototype.isPasswordCorrect = async function (password) {
  return bcrypt.compare(password, this.password);
};

export { User };
