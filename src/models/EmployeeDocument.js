import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";

const EmployeeDocument = sequelize.define("EmployeeDocument", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  // ✅ FIX: category enum updated to match your employees.hbs dropdown values
  // ✅ Also kept old typo "AADHAAAR" so existing data (if any) won't break
  category: {
    type: DataTypes.ENUM(
      "KYC",
      "RESUME",
      "AADHAAR",
      "AADHAAAR", // backward compatibility (old typo)
      "PAN",
      "ADDRESS",
      "EDUCATION",
      "EXPERIENCE",
      "HR",
      "OTHER"
    ),
    allowNull: false,
    defaultValue: "KYC",
  },

  documentType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  nameOnDocument: {
    type: DataTypes.STRING,
  },
  documentNumber: {
    type: DataTypes.STRING,
  },
  issueDate: {
    type: DataTypes.DATEONLY,
  },
  expiryDate: {
    type: DataTypes.DATEONLY,
  },
  verificationStatus: {
    type: DataTypes.ENUM("Pending", "Verified", "Rejected"),
    defaultValue: "Pending",
  },
  fileUrl: {
    type: DataTypes.STRING(1000),
  },
  documentImageUrl: {
    type: DataTypes.STRING(1000),
  },
  notes: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: "employee_documents",
  timestamps: true,
});

export default EmployeeDocument;
