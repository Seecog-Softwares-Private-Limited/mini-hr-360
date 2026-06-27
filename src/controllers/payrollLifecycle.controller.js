import Employee from '../models/Employee.js';
import {
  getEmployeePayrollLinkStatus,
  listEmployeePayrollRegister,
  getSalarySlipPrefillFromPayroll,
  buildFnfDraftFromPayroll,
  applyFnfDraftFromPayroll,
} from '../services/payrollLifecycle.service.js';
import { syncPayrollForEmployee } from '../services/employeeLifecycle.service.js';

export const apiGetPayrollLinkStatus = async (req, res, next) => {
  try {
    const status = await getEmployeePayrollLinkStatus(req.params.employeeId);
    if (!status) return res.status(404).json({ error: 'Employee not found' });
    res.json(status);
  } catch (err) {
    next(err);
  }
};

export const apiListPayrollRegister = async (req, res, next) => {
  try {
    const employee = await Employee.findByPk(req.params.employeeId, { attributes: ['id'] });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    const rows = await listEmployeePayrollRegister(req.params.employeeId, {
      limit: Number(req.query.limit) || 12,
    });
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};

export const apiSalarySlipPrefill = async (req, res, next) => {
  try {
    const prefill = await getSalarySlipPrefillFromPayroll(req.params.employeeId, {
      periodMonth: req.query.periodMonth,
      periodYear: req.query.periodYear,
    });
    res.json(prefill);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const apiFnfDraftFromPayroll = async (req, res, next) => {
  try {
    const draft = await buildFnfDraftFromPayroll(req.params.employeeId, {
      months: Number(req.query.months) || 1,
    });
    res.json({ draft });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const apiApplyFnfFromPayroll = async (req, res, next) => {
  try {
    const fnfSettlement = await applyFnfDraftFromPayroll(
      req.params.employeeId,
      req.user?.id,
      { months: Number(req.body?.months) || 1 }
    );
    res.json({ message: 'F&F draft updated from payroll register', fnfSettlement });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const apiSyncPayrollStructure = async (req, res, next) => {
  try {
    const employee = await Employee.findByPk(req.params.employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const result = await syncPayrollForEmployee(req.params.employeeId, {
      ctc: req.body?.ctc ?? employee.empCtc,
      effectiveDate: req.body?.effectiveDate || employee.empDateOfJoining,
      reason: req.body?.reason || 'manual_lifecycle_sync',
    });

    res.json({ message: 'Payroll structure synced', ...result });
  } catch (err) {
    next(err);
  }
};
