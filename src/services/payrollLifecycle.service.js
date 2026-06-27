import { Op } from 'sequelize';
import Employee from '../models/Employee.js';
import PayrollRun from '../models/PayrollRun.js';
import PayrollRunItem from '../models/PayrollRunItem.js';
import EmployeeSalaryStructure from '../models/EmployeeSalaryStructure.js';

const USABLE_RUN_STATUSES = ['Locked', 'Paid', 'Approved', 'Processing'];

function periodLabel(month, year) {
  const names = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const m = Number(month);
  return `${names[m - 1] || month} ${year}`;
}

function num(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}


function pickEarning(earnings, keys) {
  if (!earnings) return 0;
  for (const k of keys) {
    if (earnings[k] != null) return num(earnings[k]);
  }
  return 0;
}

function pickDeduction(deductions, keys) {
  if (!deductions) return 0;
  for (const k of keys) {
    if (deductions[k] != null) return num(deductions[k]);
  }
  return 0;
}

async function findPayrollItemForPeriod(employeeId, businessId, periodMonth, periodYear) {
  return PayrollRunItem.findOne({
    where: { employeeId },
    include: [
      {
        model: PayrollRun,
        required: true,
        where: {
          businessId,
          periodMonth: Number(periodMonth),
          periodYear: Number(periodYear),
          status: { [Op.in]: USABLE_RUN_STATUSES },
        },
      },
    ],
  });
}

export async function getEmployeePayrollLinkStatus(employeeId) {
  const employee = await Employee.findByPk(employeeId, {
    attributes: ['id', 'empCtc', 'businessId', 'empName', 'empId'],
  });
  if (!employee) return null;

  const activeStructure = await EmployeeSalaryStructure.findOne({
    where: { employeeId, isActive: true },
    order: [['effectiveDate', 'DESC']],
  });

  const lastItem = await PayrollRunItem.findOne({
    where: { employeeId },
    include: [
      {
        model: PayrollRun,
        attributes: ['id', 'periodMonth', 'periodYear', 'status'],
        where: { status: { [Op.in]: USABLE_RUN_STATUSES } },
        required: true,
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  const run = lastItem?.PayrollRun;

  return {
    employeeId: employee.id,
    empCtc: employee.empCtc,
    hasSalaryStructure: Boolean(activeStructure),
    salaryStructure: activeStructure
      ? {
          ctc: activeStructure.ctc,
          effectiveDate: activeStructure.effectiveDate,
        }
      : null,
    ctcAligned: activeStructure
      ? num(activeStructure.ctc) === num(employee.empCtc)
      : null,
    lastPayrollRun: run
      ? {
          payrollRunId: run.id,
          periodMonth: run.periodMonth,
          periodYear: run.periodYear,
          periodLabel: periodLabel(run.periodMonth, run.periodYear),
          status: run.status,
          netPay: lastItem.netPay,
          grossPay: lastItem.grossPay,
        }
      : null,
  };
}

export async function listEmployeePayrollRegister(employeeId, { limit = 12 } = {}) {
  const employee = await Employee.findByPk(employeeId, { attributes: ['id', 'businessId'] });
  if (!employee) return [];

  const items = await PayrollRunItem.findAll({
    where: { employeeId },
    include: [
      {
        model: PayrollRun,
        required: true,
        where: {
          businessId: employee.businessId,
          status: { [Op.in]: USABLE_RUN_STATUSES },
        },
      },
    ],
    order: [
      [{ model: PayrollRun }, 'periodYear', 'DESC'],
      [{ model: PayrollRun }, 'periodMonth', 'DESC'],
    ],
    limit,
  });

  return items.map((item) => {
    const run = item.PayrollRun;
    return {
      payrollRunId: run.id,
      payrollRunItemId: item.id,
      periodMonth: run.periodMonth,
      periodYear: run.periodYear,
      periodLabel: periodLabel(run.periodMonth, run.periodYear),
      status: run.status,
      grossPay: item.grossPay,
      netPay: item.netPay,
      totalDeductions: item.totalDeductions,
      lopDays: item.lopDays,
    };
  });
}

export async function getSalarySlipPrefillFromPayroll(employeeId, { periodMonth, periodYear } = {}) {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }

  let month = Number(periodMonth);
  let year = Number(periodYear);

  if (!month || !year) {
    const last = await listEmployeePayrollRegister(employeeId, { limit: 1 });
    if (last.length) {
      month = last[0].periodMonth;
      year = last[0].periodYear;
    } else {
      const now = new Date();
      month = now.getMonth() + 1;
      year = now.getFullYear();
    }
  }

  const item = await findPayrollItemForPeriod(employeeId, employee.businessId, month, year);

  if (!item) {
    return {
      source: 'employee_ctc',
      periodMonth: month,
      periodYear: year,
      periodLabel: periodLabel(month, year),
      salaryMonth: String(month),
      nonPaidLeave: 0,
      reimbursement: 0,
      message: 'No payroll register row for this period — using employee CTC breakup when generating.',
    };
  }

  const earnings = item.earnings || {};
  const reimbursement = pickEarning(earnings, [
    'reimbursement',
    'REIMBURSEMENT',
    'reimbursements',
  ]);

  return {
    source: 'payroll_register',
    payrollRunId: item.payrollRunId,
    payrollRunItemId: item.id,
    periodMonth: month,
    periodYear: year,
    periodLabel: periodLabel(month, year),
    salaryMonth: String(month),
    nonPaidLeave: item.lopDays || 0,
    reimbursement,
    grossPay: item.grossPay,
    netPay: item.netPay,
    totalDeductions: item.totalDeductions,
    earnings: item.earnings,
    deductions: item.deductions,
  };
}

export async function buildFnfDraftFromPayroll(employeeId, { months = 1 } = {}) {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }

  const register = await listEmployeePayrollRegister(employeeId, { limit: months });
  if (!register.length) {
    const err = new Error(
      'No payroll register data found. Run and lock payroll for this employee first.'
    );
    err.statusCode = 404;
    throw err;
  }

  const lastItem = await PayrollRunItem.findByPk(register[0].payrollRunItemId);
  const earnings = lastItem?.earnings || {};
  const deductions = lastItem?.deductions || {};

  const pfEsi =
    pickDeduction(deductions, ['pf', 'PF', 'pfEmployee', 'esi', 'ESI', 'esiEmployee']) ||
    pickDeduction(deductions, ['pf_esi']);

  const tdsPt =
    pickDeduction(deductions, ['tds', 'TDS', 'incomeTax', 'professionalTax', 'pt', 'PT']) ||
    0;

  const totalDed = num(lastItem.totalDeductions);
  const otherDed = Math.max(0, totalDed - pfEsi - tdsPt - num(deductions.noticeRecovery) - num(deductions.advanceRecovery));

  const draft = {
    E_SALARY: num(lastItem.grossPay) || num(lastItem.netPay),
    E_LEAVE_ENCASHMENT: pickEarning(earnings, ['leaveEncashment', 'LEAVE_ENCASHMENT', 'leave_encashment']),
    E_BONUS_INCENTIVE: pickEarning(earnings, ['bonus', 'BONUS', 'incentive', 'INCENTIVE']),
    E_OTHER_EARNINGS: pickEarning(earnings, [
      'other',
      'OTHER',
      'otherEarnings',
      'specialAllowance',
      'SPECIAL_ALLOWANCE',
    ]),
    D_NOTICE_RECOVERY: pickDeduction(deductions, ['noticeRecovery', 'NOTICE_RECOVERY', 'notice_recovery']),
    D_ADVANCE_RECOVERY: pickDeduction(deductions, ['advance', 'ADVANCE', 'advanceRecovery']),
    D_PF_ESI: pfEsi,
    D_TDS_PT: tdsPt,
    D_OTHER_DEDUCTIONS: otherDed,
    settlementDate: employee.lastWorkingDay || new Date().toISOString().slice(0, 10),
    paymentDate: new Date().toISOString().slice(0, 10),
    payrollSource: {
      payrollRunId: register[0].payrollRunId,
      periodLabel: register[0].periodLabel,
      monthsIncluded: register.length,
    },
  };

  return draft;
}

export async function applyFnfDraftFromPayroll(employeeId, actorUserId, options = {}) {
  const draft = await buildFnfDraftFromPayroll(employeeId, options);
  const employee = await Employee.findByPk(employeeId);
  if (!employee) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }

  employee.fnfSettlement = {
    ...(typeof employee.fnfSettlement === 'object' ? employee.fnfSettlement : {}),
    ...draft,
    updatedAt: new Date().toISOString(),
    updatedByUserId: actorUserId,
    pulledFromPayroll: true,
  };
  await employee.save();

  return employee.fnfSettlement;
}
