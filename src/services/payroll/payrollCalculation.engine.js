import { Op } from 'sequelize';
import Employee from '../../models/Employee.js';
import EmployeeSalaryAssignment from '../../models/payroll.EmployeeSalaryAssignment.js';
import SalaryStructure from '../../models/payroll.SalaryStructure.js';
import AttendanceDailySummary from '../../models/AttendanceDailySummary.js';
import { calculateStatutoryDeductions } from './statutory.engine.js';

export const calculateEmployeePayroll = async (businessId, period) => {
  const employees = await Employee.findAll({ where: { businessId } });

  const results = [];

  // ✅ Convert "YYYY-MM" -> month date range [start, end)
  const startStr = `${period}-01`;
  const start = new Date(`${period}-01T00:00:00.000Z`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const endStr = end.toISOString().slice(0, 10);

  for (const emp of employees) {
    const assignment = await EmployeeSalaryAssignment.findOne({
      where: {
        businessId,          // ✅ keep tenant safe (doesn't change output)
        employeeId: emp.id,
      },
      include: [{ model: SalaryStructure, as: 'salaryStructure' }],
    });

    if (!assignment) continue;

    // ✅ Guard (prevents crash)
    if (!assignment.salaryStructure) {
      throw new Error('Salary structure not found for employee');
    }

    const structure = assignment.salaryStructure;

    const earnings = {};
    const deductions = {};

    let gross = 0;
    let totalDeductions = 0;

    for (const comp of structure.components) {
      // ✅ support your DB format: componentId/value/rule
      const key = comp.name || comp.componentId;
      const value = Number(comp.value) || 0;

      // ✅ keep your old behavior if comp.type exists, otherwise treat as earning (no type in DB)
      if (comp.type === 'EARNING') {
        earnings[key] = value;
        gross += value;
      } else if (comp.type === 'DEDUCTION') {
        deductions[key] = value;
        totalDeductions += value;
      } else {
        earnings[key] = value;
        gross += value;
      }
    }

    // ✅ FIXED: LOP days = ABSENT count in month by date range
    const lopDays = await AttendanceDailySummary.count({
      where: {
        businessId,
        employeeId: emp.id,
        status: 'ABSENT',
        date: { [Op.gte]: startStr, [Op.lt]: endStr },
      },
    });

    const statutory = await calculateStatutoryDeductions({
      businessId,
      grossPay: gross,
      earnings,
    });

    for (const [name, value] of Object.entries(statutory)) {
      deductions[name] = value;
      totalDeductions += Number(value);
    }

    const netPay = gross - totalDeductions;

    results.push({
      employeeId: emp.id,
      earnings,
      deductions,
      grossPay: gross,
      totalDeductions,
      netPay,
      lopDays,
    });
  }

  return results;
};
