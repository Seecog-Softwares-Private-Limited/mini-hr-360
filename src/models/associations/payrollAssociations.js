/**
 * Payroll Model Associations
 * Defines relationships between payroll entities
 */

import SalaryTemplate from '../SalaryTemplate.js';
import TemplateComponent from '../TemplateComponent.js';
import Employee from '../Employee.js';
import EmployeeSalaryAssignment from '../EmployeeSalaryAssignment.js';
import SalaryRevisionHistory from '../SalaryRevisionHistory.js';
import VariablePayDefinition from '../VariablePayDefinition.js';
import ComplianceWarning from '../ComplianceWarning.js';

// SalaryTemplate -> TemplateComponent (One-to-Many)
SalaryTemplate.hasMany(TemplateComponent, {
  foreignKey: 'templateId',
  as: 'components',
});

TemplateComponent.belongsTo(SalaryTemplate, {
  foreignKey: 'templateId',
  as: 'template',
});

// Employee -> EmployeeSalaryAssignment (One-to-Many)
Employee.hasMany(EmployeeSalaryAssignment, {
  foreignKey: 'employeeId',
  as: 'salaryAssignments',
});

EmployeeSalaryAssignment.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});

// SalaryTemplate -> EmployeeSalaryAssignment (One-to-Many)
SalaryTemplate.hasMany(EmployeeSalaryAssignment, {
  foreignKey: 'templateId',
  as: 'assignments',
});

EmployeeSalaryAssignment.belongsTo(SalaryTemplate, {
  foreignKey: 'templateId',
  as: 'template',
});

// EmployeeSalaryAssignment -> SalaryRevisionHistory (One-to-Many)
EmployeeSalaryAssignment.hasMany(SalaryRevisionHistory, {
  foreignKey: 'assignmentId',
  as: 'revisions',
});

SalaryRevisionHistory.belongsTo(EmployeeSalaryAssignment, {
  foreignKey: 'assignmentId',
  as: 'assignment',
});

// Employee -> SalaryRevisionHistory (One-to-Many)
Employee.hasMany(SalaryRevisionHistory, {
  foreignKey: 'employeeId',
  as: 'salaryRevisions',
});

SalaryRevisionHistory.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});

// Employee -> VariablePayDefinition (One-to-Many)
Employee.hasMany(VariablePayDefinition, {
  foreignKey: 'employeeId',
  as: 'variablePays',
});

VariablePayDefinition.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});

// Employee -> ComplianceWarning (One-to-Many)
Employee.hasMany(ComplianceWarning, {
  foreignKey: 'employeeId',
  as: 'complianceWarnings',
});

ComplianceWarning.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});

// SalaryTemplate -> ComplianceWarning (One-to-Many)
SalaryTemplate.hasMany(ComplianceWarning, {
  foreignKey: 'templateId',
  as: 'complianceWarnings',
});

ComplianceWarning.belongsTo(SalaryTemplate, {
  foreignKey: 'templateId',
  as: 'template',
});

export {
  SalaryTemplate,
  TemplateComponent,
  EmployeeSalaryAssignment,
  SalaryRevisionHistory,
  VariablePayDefinition,
  ComplianceWarning,
};
