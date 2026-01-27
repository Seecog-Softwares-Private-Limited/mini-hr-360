import SalaryStructure from '../../models/payroll.SalaryStructure.js';
import EmployeeSalaryAssignment from '../../models/payroll.EmployeeSalaryAssignment.js';

export const listStructures = async (businessId) => {
  return SalaryStructure.findAll({ where: { businessId } });
};

export const createStructure = async (businessId, data) => {
  return SalaryStructure.create({ ...data, businessId });
};

export const assignToEmployee = async (businessId, {
  employeeId,
  salaryStructureId,
  effectiveFrom,
}) => {
  return EmployeeSalaryAssignment.create({
    businessId,
    employeeId,
    salaryStructureId,
    effectiveFrom,
  });
};
