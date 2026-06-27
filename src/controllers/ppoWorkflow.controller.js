import Employee from '../models/Employee.js';
import {
  getPpoWizardState,
  executePpoConversion,
  initiateInternCompletionExit,
} from '../services/ppoWorkflow.service.js';

export const renderPpoWorkflowPage = async (req, res, next) => {
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

    res.render('ppoWorkflow', {
      layout: 'main',
      title: `Intern / PPO — ${employee.empName}`,
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

export const apiGetPpoWizard = async (req, res, next) => {
  try {
    const state = await getPpoWizardState(req.params.employeeId);
    if (!state) return res.status(404).json({ error: 'Employee not found' });
    res.json(state);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const apiExecutePpoConversion = async (req, res, next) => {
  try {
    const updated = await executePpoConversion(req.params.employeeId, req.body, req.user?.id);
    res.json({
      message: 'Converted to permanent — generate PPO letter next',
      employeeType: updated.employeeType,
      lifecycleStage: updated.lifecycleStage,
      empCtc: updated.empCtc,
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const apiInternCompletionExit = async (req, res, next) => {
  try {
    const updated = await initiateInternCompletionExit(
      req.params.employeeId,
      req.user?.id,
      req.body
    );
    res.json({
      message: 'Internship completion exit initiated',
      lifecycleStage: updated.lifecycleStage,
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};
