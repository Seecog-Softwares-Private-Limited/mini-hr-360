import { PayrollRun, PayrollRunItem, Employee, StatutoryCompliance } from '../../models/index.js';
import { ApiError } from '../../utils/ApiError.js';

const ensureRun = async (runId) => {
  const run = await PayrollRun.findByPk(runId);
  if (!run) throw new ApiError(404, 'Payroll run not found');
  return run;
};

// Helper to get deduction value by multiple possible keys
const getDeduction = (deductions, ...keys) => {
  if (!deductions) return 0;
  for (const key of keys) {
    if (deductions[key] !== undefined && deductions[key] !== null) {
      return Number(deductions[key]) || 0;
    }
  }
  return 0;
};

// Helper to get earning value by multiple possible keys  
const getEarning = (earnings, ...keys) => {
  if (!earnings) return 0;
  for (const key of keys) {
    if (earnings[key] !== undefined && earnings[key] !== null) {
      return Number(earnings[key]) || 0;
    }
  }
  return 0;
};

export const generatePFReport = async (runId) => {
  await ensureRun(runId);

  const items = await PayrollRunItem.findAll({
    where: { payrollRunId: runId },
    include: [{ model: Employee, attributes: ['id', 'empId', 'empName', 'empDepartment'] }]
  });

  const report = [];

  for (const item of items) {
    const pfAmount = getDeduction(item.deductions, 'PF', 'Provident Fund', 'provident_fund', 'pf', 'EPF', 'Employee PF');
    if (pfAmount <= 0) continue;

    const emp = item.Employee;
    report.push({
      employeeId: emp?.id || item.employeeId,
      empId: emp?.empId || '-',
      employeeName: emp?.empName || 'Unknown',
      department: emp?.empDepartment || '-',
      uan: '-',
      pan: '-',
      basicWages: getEarning(item.earnings, 'Basic', 'BASIC', 'basic', 'Basic Salary'),
      pfAmount: pfAmount,
      employeeShare: Math.round(pfAmount / 2 * 100) / 100,
      employerShare: Math.round(pfAmount / 2 * 100) / 100,
    });
  }

  return report;
};

export const generateESIReport = async (runId) => {
  await ensureRun(runId);

  const items = await PayrollRunItem.findAll({
    where: { payrollRunId: runId },
    include: [{ model: Employee, attributes: ['id', 'empId', 'empName', 'empDepartment'] }]
  });

  const report = [];

  for (const item of items) {
    const esiAmount = getDeduction(item.deductions, 'ESI', 'Employee State Insurance', 'esi', 'ESIC');
    if (esiAmount <= 0) continue;

    const emp = item.Employee;
    const employeeShare = Math.round(esiAmount * 100) / 100;
    const employerShare = Math.round(esiAmount * (3.25 / 0.75) * 100) / 100;
    
    report.push({
      employeeId: emp?.id || item.employeeId,
      empId: emp?.empId || '-',
      employeeName: emp?.empName || 'Unknown',
      department: emp?.empDepartment || '-',
      esiNumber: '-',
      grossWages: item.grossPay,
      esiAmount: esiAmount,
      employeeShare,
      employerShare,
      totalContribution: Math.round((employeeShare + employerShare) * 100) / 100,
    });
  }

  return report;
};

export const generatePTReport = async (runId) => {
  await ensureRun(runId);

  const items = await PayrollRunItem.findAll({
    where: { payrollRunId: runId },
    include: [{ model: Employee, attributes: ['id', 'empId', 'empName', 'empDepartment', 'presentState'] }]
  });

  const report = [];

  for (const item of items) {
    const ptAmount = getDeduction(item.deductions, 'PT', 'Professional Tax', 'professional_tax', 'pt');
    if (ptAmount <= 0) continue;

    const emp = item.Employee;
    report.push({
      employeeId: emp?.id || item.employeeId,
      empId: emp?.empId || '-',
      employeeName: emp?.empName || 'Unknown',
      department: emp?.empDepartment || '-',
      state: emp?.presentState || '-',
      grossSalary: item.grossPay,
      ptAmount: ptAmount,
    });
  }

  return report;
};

export const generateTDSReport = async (runId) => {
  await ensureRun(runId);

  const items = await PayrollRunItem.findAll({
    where: { payrollRunId: runId },
    include: [{ model: Employee, attributes: ['id', 'empId', 'empName', 'empDepartment'] }]
  });

  const report = [];

  for (const item of items) {
    const tdsAmount = getDeduction(item.deductions, 'TDS', 'Tax Deducted at Source', 'Income Tax', 'tds', 'IT');
    if (tdsAmount <= 0) continue;

    const emp = item.Employee;
    const taxableIncome = item.grossPay;
    const effectiveRate = taxableIncome > 0 ? Math.round((tdsAmount / taxableIncome) * 100 * 100) / 100 : 0;
    
    report.push({
      employeeId: emp?.id || item.employeeId,
      empId: emp?.empId || '-',
      employeeName: emp?.empName || 'Unknown',
      department: emp?.empDepartment || '-',
      pan: '-',
      taxableIncome: taxableIncome,
      tdsAmount: tdsAmount,
      effectiveRate: effectiveRate,
    });
  }

  return report;
};

// Compliance Checklist Management
export const getComplianceStatus = async (runId) => {
  const run = await PayrollRun.findByPk(runId);
  if (!run) return null;
  
  const businessId = run.businessId;
  
  let compliance = await StatutoryCompliance.findOne({
    where: { businessId, payrollRunId: runId }
  });

  if (!compliance) {
    compliance = await StatutoryCompliance.create({
      businessId,
      payrollRunId: runId,
      periodMonth: run.periodMonth,
      periodYear: run.periodYear,
      pfFiled: false,
      esiFiled: false,
      ptFiled: false,
      tdsDeposited: false,
    });
  }

  return compliance;
};

export const updateComplianceStatus = async (runId, field, value) => {
  const validFields = ['pfFiled', 'esiFiled', 'ptFiled', 'tdsDeposited'];
  if (!validFields.includes(field)) {
    throw new ApiError(400, `Invalid compliance field: ${field}`);
  }

  const run = await PayrollRun.findByPk(runId);
  if (!run) throw new ApiError(404, 'Payroll run not found');
  
  const businessId = run.businessId;

  let compliance = await StatutoryCompliance.findOne({
    where: { businessId, payrollRunId: runId }
  });

  if (!compliance) {
    compliance = await StatutoryCompliance.create({
      businessId,
      payrollRunId: runId,
      periodMonth: run.periodMonth,
      periodYear: run.periodYear,
    });
  }

  const updates = { [field]: Boolean(value) };
  if (value) {
    updates[`${field}At`] = new Date();
  } else {
    updates[`${field}At`] = null;
  }

  await compliance.update(updates);
  return compliance;
};

// Get summary data with all amounts
export const getStatutorySummary = async (runId) => {
  const run = await ensureRun(runId);

  const items = await PayrollRunItem.findAll({
    where: { payrollRunId: runId },
  });

  // PF Summary - check multiple possible key names
  const pfItems = items.filter(i => getDeduction(i.deductions, 'PF', 'Provident Fund', 'provident_fund', 'pf', 'EPF', 'Employee PF') > 0);
  const totalPF = pfItems.reduce((s, i) => s + getDeduction(i.deductions, 'PF', 'Provident Fund', 'provident_fund', 'pf', 'EPF', 'Employee PF'), 0);
  const pfSummary = {
    employeeCount: pfItems.length,
    totalContribution: Math.round(totalPF * 2 * 100) / 100,
    employerShare: Math.round(totalPF * 100) / 100,
    employeeShare: Math.round(totalPF * 100) / 100,
  };

  // ESI Summary
  const esiItems = items.filter(i => getDeduction(i.deductions, 'ESI', 'Employee State Insurance', 'esi', 'ESIC') > 0);
  const totalESIEmployee = esiItems.reduce((s, i) => s + getDeduction(i.deductions, 'ESI', 'Employee State Insurance', 'esi', 'ESIC'), 0);
  const totalESIEmployer = Math.round(totalESIEmployee * (3.25 / 0.75) * 100) / 100;
  const esiSummary = {
    employeeCount: esiItems.length,
    totalContribution: Math.round((totalESIEmployee + totalESIEmployer) * 100) / 100,
    employerShare: totalESIEmployer,
    employeeShare: Math.round(totalESIEmployee * 100) / 100,
  };

  // PT Summary
  const ptItems = items.filter(i => getDeduction(i.deductions, 'PT', 'Professional Tax', 'professional_tax', 'pt') > 0);
  const totalPT = ptItems.reduce((s, i) => s + getDeduction(i.deductions, 'PT', 'Professional Tax', 'professional_tax', 'pt'), 0);
  const ptSummary = {
    employeeCount: ptItems.length,
    totalPT: Math.round(totalPT * 100) / 100,
    avgPerEmployee: ptItems.length > 0 ? Math.round(totalPT / ptItems.length * 100) / 100 : 0,
  };

  // TDS Summary
  const tdsItems = items.filter(i => getDeduction(i.deductions, 'TDS', 'Tax Deducted at Source', 'Income Tax', 'tds', 'IT') > 0);
  const totalTDS = tdsItems.reduce((s, i) => s + getDeduction(i.deductions, 'TDS', 'Tax Deducted at Source', 'Income Tax', 'tds', 'IT'), 0);
  const totalTaxableIncome = tdsItems.reduce((s, i) => s + Number(i.grossPay || 0), 0);
  const avgTaxRate = totalTaxableIncome > 0 ? Math.round((totalTDS / totalTaxableIncome) * 100 * 100) / 100 : 0;
  const tdsSummary = {
    employeeCount: tdsItems.length,
    totalTDS: Math.round(totalTDS * 100) / 100,
    avgTaxRate: avgTaxRate,
    totalTaxableIncome: Math.round(totalTaxableIncome * 100) / 100,
  };

  return {
    period: `${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}`,
    periodDisplay: new Date(run.periodYear, run.periodMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' }),
    runId: run.id,
    runStatus: run.status,
    pfSummary,
    esiSummary,
    ptSummary,
    tdsSummary,
  };
};
