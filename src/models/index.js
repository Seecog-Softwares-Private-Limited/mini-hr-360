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

// Payroll
import PayrollSetup from './PayrollSetup.js';
import SalaryStructure from './SalaryStructure.js';
import EmployeeSalaryStructure from './EmployeeSalaryStructure.js';
import PayrollRun from './PayrollRun.js';
import PayrollRegister from './PayrollRegister.js';
import Payslip from './Payslip.js';
import PayrollQuery from './PayrollQuery.js';
import EmployeeBankDetail from './EmployeeBankDetail.js';
import UserEducation from './UserEducation.js';
import UserExperience from './UserExperience.js';
import UserDocument from './UserDocument.js';

import PayrollRunItem from "./PayrollRunItem.js";
import EmployeeSalaryAssignment from "./payroll.EmployeeSalaryAssignment.js";
import PayrollSetting from "./payrollSetting.js";

/* ===================== CORE ===================== */

// LeaveType ⇄ LeaveBalance
LeaveType.hasMany(LeaveBalance, {
  foreignKey: 'leaveTypeId',
  as: 'balances',
});

LeaveBalance.belongsTo(LeaveType, {
  foreignKey: 'leaveTypeId',
  as: 'leaveType',
});

// LeaveType ⇄ LeaveRequest
LeaveType.hasMany(LeaveRequest, {
  foreignKey: 'leaveTypeId',
  as: 'requests',
});

LeaveRequest.belongsTo(LeaveType, {
  foreignKey: 'leaveTypeId',
  as: 'leaveType',
});

// Business ⇄ LeaveType (needed because controller includes Business in LeaveType)
Business.hasMany(LeaveType, { foreignKey: 'businessId', as: 'leaveTypes' });
LeaveType.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

// Employee ⇄ LeaveRequest (THIS fixes your current error)
Employee.hasMany(LeaveRequest, { foreignKey: 'employeeId', as: 'leaveRequests' });
LeaveRequest.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

// User ⇄ LeaveRequest (approver include in controllers)
User.hasMany(LeaveRequest, { foreignKey: 'approverId', as: 'approvedLeaveRequests' });
LeaveRequest.belongsTo(User, { foreignKey: 'approverId', as: 'approver' });

// LeaveRequest ⇄ LeaveApproval (needed for employee leave details timeline)
LeaveRequest.hasMany(LeaveApproval, { foreignKey: 'leaveRequestId', as: 'approvals' });
LeaveApproval.belongsTo(LeaveRequest, { foreignKey: 'leaveRequestId', as: 'leaveRequest' });

// User ⇄ LeaveApproval (nested include: { model: User, as: 'approver' })
User.hasMany(LeaveApproval, { foreignKey: 'approverId', as: 'leaveApprovals' });
LeaveApproval.belongsTo(User, { foreignKey: 'approverId', as: 'approver' });



// User ⇄ Business
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

// Message Logs
Campaign.hasMany(MessageLog, { foreignKey: 'campaignId', as: 'messageLogs' });
MessageLog.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });

Customer.hasMany(MessageLog, { foreignKey: 'customerId', as: 'messageLogs' });
MessageLog.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Template.hasMany(MessageLog, { foreignKey: 'templateId', as: 'messageLogs' });
MessageLog.belongsTo(Template, { foreignKey: 'templateId', as: 'template' });

/* ===================== HR ===================== */

Business.hasMany(Employee, { foreignKey: 'businessId', as: 'employees' });
Employee.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

Business.hasMany(Department, { foreignKey: 'businessId', as: 'departments' });
Department.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

Business.hasMany(Service, { foreignKey: 'businessId', as: 'services' });
Service.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

Business.hasMany(Designation, { foreignKey: 'businessId', as: 'designations' });
Designation.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

// Employee ⇄ Education
Employee.hasMany(EmployeeEducation, { foreignKey: 'employeeId', as: 'educations' });
EmployeeEducation.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

// Employee ⇄ Experience
Employee.hasMany(EmployeeExperience, { foreignKey: 'employeeId', as: 'experiences' });
EmployeeExperience.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

// Employee ⇄ Documents
Employee.hasMany(EmployeeDocument, { foreignKey: 'employeeId', as: 'documents' });
EmployeeDocument.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });




/* ===================== ATTENDANCE ===================== */

// Employee ⇄ Shift Assignment
Employee.hasMany(EmployeeShiftAssignment, {
  foreignKey: 'employeeId',
  as: 'shiftAssignments',
});
EmployeeShiftAssignment.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});

// Policy ⇄ Shift Assignment
AttendancePolicy.hasMany(EmployeeShiftAssignment, {
  foreignKey: 'policyId',
  as: 'shiftAssignments',
});
EmployeeShiftAssignment.belongsTo(AttendancePolicy, {
  foreignKey: 'policyId',
  as: 'policy',
});

// Shift ⇄ Shift Assignment
Shift.hasMany(EmployeeShiftAssignment, {
  foreignKey: 'shiftId',
  as: 'assignments',
});
EmployeeShiftAssignment.belongsTo(Shift, {
  foreignKey: 'shiftId',
  as: 'shift',
});

// Attendance records
Employee.hasMany(AttendancePunch, { foreignKey: 'employeeId', as: 'punches' });
AttendancePunch.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Employee.hasMany(AttendanceDailySummary, { foreignKey: 'employeeId', as: 'dailySummaries' });
AttendanceDailySummary.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Employee.hasMany(AttendanceRegularization, { foreignKey: 'employeeId', as: 'regularizations' });
AttendanceRegularization.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

User.hasMany(AttendanceRegularization, { foreignKey: 'actionByUserId', as: 'actionedRegularizations' });
AttendanceRegularization.belongsTo(User, { foreignKey: 'actionByUserId', as: 'actionBy' });

Business.hasMany(AttendanceLock, { foreignKey: 'businessId', as: 'attendanceLocks' });
AttendanceLock.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

/* ===================== PAYROLL ===================== */

Business.hasOne(PayrollSetup, { foreignKey: 'businessId', as: 'payrollSetup' });
PayrollSetup.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

Business.hasOne(PayrollSetting, { foreignKey: 'businessId', as: 'payrollSetting' });
PayrollSetting.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

Business.hasMany(SalaryStructure, { foreignKey: 'businessId', as: 'salaryStructures' });
SalaryStructure.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

SalaryStructure.hasMany(EmployeeSalaryAssignment, {
  foreignKey: 'salaryStructureId',
  as: 'employeeSalaryAssignments',
});
EmployeeSalaryAssignment.belongsTo(SalaryStructure, {
  foreignKey: 'salaryStructureId',
  as: 'salaryStructure',
});

Business.hasMany(PayrollRun, { foreignKey: 'businessId', as: 'payrollRuns' });
PayrollRun.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

PayrollRun.hasMany(PayrollRunItem, { foreignKey: 'payrollRunId' });
PayrollRunItem.belongsTo(PayrollRun, { foreignKey: 'payrollRunId' });

PayrollRun.hasMany(Payslip, { foreignKey: 'payrollRunId', as: 'payslips' });
Payslip.belongsTo(PayrollRun, { foreignKey: 'payrollRunId', as: 'payrollRun' });

Employee.hasMany(Payslip, { foreignKey: 'employeeId', as: 'payslips' });
Payslip.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

/* ===================== EXPORT ===================== */

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
  PayrollRun,
  PayrollRunItem,
  Payslip,
  SalaryStructure,
  EmployeeSalaryAssignment,
  PayrollSetting,
  PayrollSetup,
  EmployeeSalaryStructure,
  PayrollRegister,
  PayrollQuery,
  EmployeeBankDetail,
  UserEducation,
  UserExperience,
  UserDocument,
};
