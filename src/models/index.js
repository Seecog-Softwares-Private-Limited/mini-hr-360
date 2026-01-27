import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";

// src/models/index.js
import { User } from './User.js';
import { Business } from './Business.js';
import { Customer } from './Customer.js';
import { Template } from './Template.js';
import { Campaign } from './Campaign.js';
import { MessageLog } from './MessageLog.js';
import Employee from './Employee.js';
import { Department } from './Department.js';
import { Service } from './Service.js';
import { Designation } from './Designation.js';
import { LeaveType } from './LeaveType.js';
import { LeaveRequest } from './LeaveRequest.js';
import { LeaveBalance } from './LeaveBalance.js';
import { LeaveApproval } from './LeaveApproval.js';
import DocumentType from './DocumentType.js';
import EmailTemplate from './EmailTemplate.js';
import AttendanceDailySummary from './AttendanceDailySummary.js';
import AttendanceLock from './AttendanceLock.js';
import AttendancePolicy from './AttendancePolicy.js';
import AttendancePunch from './AttendancePunch.js';
import AttendanceRegularization from './AttendanceRegularization.js';
import EmployeeShiftAssignment from './EmployeeShiftAssignment.js';
import Holiday from './Holiday.js';
import Shift from './Shift.js';

// Child tables for Employee
import EmployeeEducation from './EmployeeEducation.js';
import EmployeeExperience from './EmployeeExperience.js';
import EmployeeDocument from './EmployeeDocument.js';
// Attendance





import PayrollRun from "./payroll.PayrollRun.js";
import PayrollRunItem from "./PayrollRunItem.js";
import Payslip from "./payroll.Payslip.js";

import SalaryStructure from "./payroll.SalaryStructure.js";
import EmployeeSalaryAssignment from "./payroll.EmployeeSalaryAssignment.js";
import PayrollSetting from "./payrollSetting.js";


/**
 * IMPORTANT:
 * - Business.ownerId is the FK to User (not userId).
 * - Campaign belongs to Business (missing before).
 * - Keep aliases used in controllers: 'business', 'template', etc.
 */

// User ⇄ Business  (Business.ownerId)
User.hasMany(Business, { foreignKey: 'ownerId', as: 'businesses' });
Business.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// User ⇄ Customer
User.hasMany(Customer, { foreignKey: 'userId', as: 'customers' });
Customer.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Business ⇄ Customer
Business.hasMany(Customer, { foreignKey: 'businessId', as: 'customers' });
Customer.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

// User ⇄ Template
User.hasMany(Template, { foreignKey: 'userId', as: 'templates' });
Template.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User ⇄ Campaign
User.hasMany(Campaign, { foreignKey: 'userId', as: 'campaigns' });
Campaign.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Business ⇄ Campaign
Business.hasMany(Campaign, { foreignKey: 'businessId', as: 'campaigns' });
Campaign.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

// Template ⇄ Campaign
Template.hasMany(Campaign, { foreignKey: 'templateId', as: 'campaigns' });
Campaign.belongsTo(Template, { foreignKey: 'templateId', as: 'template' });

// Campaign/Customer/Template ⇄ MessageLog
Campaign.hasMany(MessageLog, { foreignKey: 'campaignId', as: 'messageLogs' });
MessageLog.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });

Customer.hasMany(MessageLog, { foreignKey: 'customerId', as: 'messageLogs' });
MessageLog.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Template.hasMany(MessageLog, { foreignKey: 'templateId', as: 'messageLogs' });
MessageLog.belongsTo(Template, { foreignKey: 'templateId', as: 'template' });

/* ✅ NEW: Business ⇄ Department */
Business.hasMany(Department, {
  foreignKey: 'businessId',
  as: 'departments',
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE',
});
Department.belongsTo(Business, {
  foreignKey: 'businessId',
  as: 'business',
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE',
});

Business.hasMany(Service, { foreignKey: 'businessId', as: 'services' });
Service.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

// Business ⇄ Designation
Business.hasMany(Designation, { foreignKey: 'businessId', as: 'designations' });
Designation.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

// Business ⇄ LeaveType
Business.hasMany(LeaveType, { foreignKey: 'businessId', as: 'leaveTypes' });
LeaveType.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

// Business ⇄ LeaveRequest
Business.hasMany(LeaveRequest, { foreignKey: 'businessId', as: 'leaveRequests' });
LeaveRequest.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

// Employee ⇄ LeaveRequest
Employee.hasMany(LeaveRequest, { foreignKey: 'employeeId', as: 'leaveRequests' });
LeaveRequest.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

// LeaveType ⇄ LeaveRequest
LeaveType.hasMany(LeaveRequest, { foreignKey: 'leaveTypeId', as: 'requests' });
LeaveRequest.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', as: 'leaveType' });

// Approver (User) ⇄ LeaveRequest
User.hasMany(LeaveRequest, { foreignKey: 'approverId', as: 'approvedLeaves' });
LeaveRequest.belongsTo(User, { foreignKey: 'approverId', as: 'approver' });

// Business ⇄ LeaveBalance
Business.hasMany(LeaveBalance, { foreignKey: 'businessId', as: 'leaveBalances' });
LeaveBalance.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

// Employee ⇄ LeaveBalance
Employee.hasMany(LeaveBalance, { foreignKey: 'employeeId', as: 'leaveBalances' });
LeaveBalance.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

// LeaveType ⇄ LeaveBalance
LeaveType.hasMany(LeaveBalance, { foreignKey: 'leaveTypeId', as: 'balances' });
LeaveBalance.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', as: 'leaveType' });

// Business ⇄ LeaveApproval
Business.hasMany(LeaveApproval, { foreignKey: 'businessId', as: 'leaveApprovals' });
LeaveApproval.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

// LeaveRequest ⇄ LeaveApproval
LeaveRequest.hasMany(LeaveApproval, { foreignKey: 'leaveRequestId', as: 'approvals' });
LeaveApproval.belongsTo(LeaveRequest, { foreignKey: 'leaveRequestId', as: 'leaveRequest' });

// User (approver) ⇄ LeaveApproval
User.hasMany(LeaveApproval, { foreignKey: 'approverId', as: 'leaveApprovalActions' });
LeaveApproval.belongsTo(User, { foreignKey: 'approverId', as: 'approver' });

// Employee ⇄ Business (multi-tenancy)
Business.hasMany(Employee, { foreignKey: 'businessId', as: 'employees' });
Employee.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

/* ✅ PayrollSetting ⇄ Business (IMPORTANT) */
Business.hasOne(PayrollSetting, {
  foreignKey: 'businessId',
  as: 'payrollSetting',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
PayrollSetting.belongsTo(Business, {
  foreignKey: 'businessId',
  as: 'business',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

Employee.hasMany(EmployeeShiftAssignment, {
  foreignKey: 'employeeId',
  as: 'shiftAssignments',
});

EmployeeShiftAssignment.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});

AttendancePolicy.hasMany(EmployeeShiftAssignment, {
  foreignKey: 'policyId',
  as: 'shiftAssignments',
});


EmployeeShiftAssignment.belongsTo(AttendancePolicy, {
  foreignKey: 'policyId',
  as: 'policy',
});

Shift.hasMany(EmployeeShiftAssignment, {
  foreignKey: 'shiftId',
  as: 'assignments',
});

EmployeeShiftAssignment.belongsTo(Shift, {
  foreignKey: 'shiftId',
  as: 'shift',
});

Employee.hasMany(AttendanceRegularization, {
  foreignKey: 'employeeId',
  as: 'regularizations',
});
AttendanceRegularization.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});

Employee.hasMany(AttendanceDailySummary, {
  foreignKey: 'employeeId',
  as: 'dailySummaries',
});
AttendanceDailySummary.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});

/* admin payroll */
PayrollRun.hasMany(PayrollRunItem, { foreignKey: 'payrollRunId' });
PayrollRunItem.belongsTo(PayrollRun, { foreignKey: "payrollRunId" });

PayrollRun.hasMany(Payslip, { foreignKey: 'payrollRunId' });




SalaryStructure.hasMany(EmployeeSalaryAssignment, {
  foreignKey: 'salaryStructureId',
  as: 'employeeSalaryAssignments',
});

EmployeeSalaryAssignment.belongsTo(SalaryStructure, {
  foreignKey: 'salaryStructureId',
  as: 'salaryStructure',
});






/* ✅ NEW: Employee ⇄ EmployeeEducation */
Employee.hasMany(EmployeeEducation, {
  foreignKey: 'employeeId',
  as: 'educations',
  onDelete: 'CASCADE',
  hooks: true,
});
EmployeeEducation.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});

/* ✅ NEW: Employee ⇄ EmployeeExperience */
Employee.hasMany(EmployeeExperience, {
  foreignKey: 'employeeId',
  as: 'experiences',
  onDelete: 'CASCADE',
  hooks: true,
});
EmployeeExperience.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});

/* ✅ NEW: Employee ⇄ EmployeeDocument */
Employee.hasMany(EmployeeDocument, {
  foreignKey: 'employeeId',
  as: 'documents',
  onDelete: 'CASCADE',
  hooks: true,
});
EmployeeDocument.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});

// DocumentType ⇄ EmailTemplate
DocumentType.hasMany(EmailTemplate, {
  foreignKey: 'documentTypeId',
  as: 'emailTemplates',
});

EmailTemplate.belongsTo(DocumentType, {
  foreignKey: 'documentTypeId',
  as: 'documentType',
});

// ========== BILLING MODELS ==========
import { Plan } from './Plan.js';
import { Subscription } from './Subscription.js';
import { Invoice } from './Invoice.js';
import { WebhookLog } from './WebhookLog.js';

// Business ⇄ Subscription
Business.hasMany(Subscription, { foreignKey: 'businessId', as: 'subscriptions' });
Subscription.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

// Plan ⇄ Subscription
Plan.hasMany(Subscription, { foreignKey: 'planId', as: 'subscriptions' });
Subscription.belongsTo(Plan, { foreignKey: 'planId', as: 'plan' });

// Subscription ⇄ Invoice
Subscription.hasMany(Invoice, { foreignKey: 'subscriptionId', as: 'invoices' });
Invoice.belongsTo(Subscription, { foreignKey: 'subscriptionId', as: 'subscription' });

// Business ⇄ Invoice
Business.hasMany(Invoice, { foreignKey: 'businessId', as: 'invoices' });
Invoice.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });


// --- Attendance Module Relationships ---
Business.hasMany(AttendancePolicy, { foreignKey: 'businessId', as: 'attendancePolicies' });
AttendancePolicy.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

Business.hasMany(Shift, { foreignKey: 'businessId', as: 'shifts' });
Shift.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

Business.hasMany(Holiday, { foreignKey: 'businessId', as: 'holidays' });
Holiday.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

export {
  AttendancePolicy,
  Shift,
  Holiday,
  EmployeeShiftAssignment,
  AttendancePunch,
  AttendanceDailySummary,
  AttendanceRegularization,
  AttendanceLock,
  User,
  Business,
  Customer,
  Template,
  Campaign,
  MessageLog,
  Department,
  Service,
  Designation,
  LeaveType,
  LeaveRequest,
  LeaveBalance,
  LeaveApproval,
  Employee,
  DocumentType,
  EmployeeEducation,
  EmployeeExperience,
  EmployeeDocument,
  EmailTemplate,
  // Billing models
  Plan,
  Subscription,
  Invoice,
  WebhookLog,
  PayrollRun,
  PayrollRunItem,
  Payslip,
  SalaryStructure,
  EmployeeSalaryAssignment,
  PayrollSetting

};
