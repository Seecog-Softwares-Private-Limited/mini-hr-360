import Employee from '../models/Employee.js';
import {
  getContractWizardState,
  renewContract,
  initiateContractNonRenewal,
} from '../services/contractWorkflow.service.js';

export const renderContractWorkflowPage = async (req, res, next) => {
  try {
    const employee = await Employee.findByPk(req.params.employeeId, {
      attributes: ['id', 'empName', 'empId', 'employeeType', 'lifecycleStage'],
    });
    if (!employee) {
      return res.status(404).render('error', {
        layout: 'main',
        title: 'Not found',
        message: 'Employee not found',
      });
    }

    const user = req.user
      ? { firstName: req.user.firstName, lastName: req.user.lastName, role: req.user.role }
      : {};

    res.render('contractWorkflow', {
      layout: 'main',
      title: `Contract — ${employee.empName}`,
      user,
      active: 'employees',
      activeGroup: 'workspace',
      employeeId: employee.id,
      employeeName: employee.empName,
      employeeCode: employee.empId,
    });
  } catch (err) {
    next(err);
  }
};

export const apiGetContractWizard = async (req, res, next) => {
  try {
    const state = await getContractWizardState(req.params.employeeId);
    if (!state) return res.status(404).json({ error: 'Employee not found' });
    res.json(state);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const apiRenewContract = async (req, res, next) => {
  try {
    const result = await renewContract(req.params.employeeId, req.body, req.user?.id);
    res.json({
      message: 'Contract renewed',
      contractEndDate: result.employee.contractEndDate,
      empCtc: result.employee.empCtc,
      payrollResult: result.payrollResult,
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const apiContractNonRenewal = async (req, res, next) => {
  try {
    const updated = await initiateContractNonRenewal(
      req.params.employeeId,
      req.user?.id,
      req.body
    );
    res.json({
      message: 'Non-renewal exit initiated',
      lifecycleStage: updated.lifecycleStage,
      lastWorkingDay: updated.lastWorkingDay,
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};
