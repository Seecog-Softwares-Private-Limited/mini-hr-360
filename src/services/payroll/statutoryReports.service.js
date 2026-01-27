import PayrollRun from '../../models/payroll.PayrollRun.js';
import PayrollRunItem from '../../models/PayrollRunItem.js';
import Employee from '../../models/Employee.js';
import { ApiError } from '../../utils/ApiError.js';

const ensureLockedRun = async (runId) => {
  const run = await PayrollRun.findByPk(runId);
  if (!run) throw new ApiError(404, 'Payroll run not found');
  if (run.status !== 'LOCKED') {
    throw new ApiError(400, 'Payroll must be locked before statutory reports');
  }
  return run;
};

export const generatePFReport = async (runId) => {
  await ensureLockedRun(runId);

  const items = await PayrollRunItem.findAll({
    where: { payrollRunId: runId },
  });

  const report = [];

  for (const item of items) {
    if (!item.deductions?.PF) continue;

    const employee = await Employee.findByPk(item.employeeId);

    report.push({
      employeeId: employee.id,
      employeeName: employee.name,
      uan: employee.uan || null,
      pfAmount: item.deductions.PF,
    });
  }

  return report;
};

export const generateESIReport = async (runId) => {
  await ensureLockedRun(runId);

  const items = await PayrollRunItem.findAll({
    where: { payrollRunId: runId },
  });

  const report = [];

  for (const item of items) {
    if (!item.deductions?.ESI) continue;

    const employee = await Employee.findByPk(item.employeeId);

    report.push({
      employeeId: employee.id,
      employeeName: employee.name,
      esiNumber: employee.esiNumber || null,
      esiAmount: item.deductions.ESI,
    });
  }

  return report;
};

export const generatePTReport = async (runId) => {
  await ensureLockedRun(runId);

  const items = await PayrollRunItem.findAll({
    where: { payrollRunId: runId },
  });

  return items
    .filter(i => i.deductions?.PT)
    .map(i => ({
      employeeId: i.employeeId,
      ptAmount: i.deductions.PT,
    }));
};

export const generateTDSReport = async (runId) => {
  await ensureLockedRun(runId);

  const items = await PayrollRunItem.findAll({
    where: { payrollRunId: runId },
  });

  return items
    .filter(i => i.deductions?.TDS)
    .map(i => ({
      employeeId: i.employeeId,
      tdsAmount: i.deductions.TDS,
    }));
};
