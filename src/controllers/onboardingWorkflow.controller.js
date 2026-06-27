import Employee from '../models/Employee.js';
import {
  getOnboardingWizardState,
  patchOnboardingStage,
} from '../services/onboardingWorkflow.service.js';

export const renderOnboardingWorkflowPage = async (req, res, next) => {
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

    res.render('onboardingWorkflow', {
      layout: 'main',
      title: `Onboarding — ${employee.empName}`,
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

export const apiGetOnboardingWizard = async (req, res, next) => {
  try {
    const state = await getOnboardingWizardState(req.params.employeeId);
    if (!state) return res.status(404).json({ error: 'Employee not found' });
    res.json(state);
  } catch (err) {
    next(err);
  }
};

export const apiPatchOnboardingStage = async (req, res, next) => {
  try {
    const { stage } = req.body;
    if (!stage) return res.status(400).json({ error: 'stage is required' });
    const updated = await patchOnboardingStage(req.params.employeeId, stage, req.user?.id);
    res.json({ message: 'Stage updated', lifecycleStage: updated.lifecycleStage });
  } catch (err) {
    if (err.message?.includes('Invalid lifecycle')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
};
