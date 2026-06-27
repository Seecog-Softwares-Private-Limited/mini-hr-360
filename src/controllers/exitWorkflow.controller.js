import {
  getExitWizardState,
  saveFnfSettlement,
  initiateExitWithNotifications,
  completeExitWithValidation,
  updateChecklistWithNotifications,
} from '../services/exitWorkflow.service.js';
import { getLifecycleAlertsSummary } from '../services/lifecycleAlerts.service.js';
import { resolveOrganizationIdFromRequest } from '../services/organization.service.js';
import Employee from '../models/Employee.js';

export const renderExitWorkflowPage = async (req, res, next) => {
  try {
    const employeeId = req.params.employeeId;
    const employee = await Employee.findByPk(employeeId, {
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

    res.render('exitWorkflow', {
      layout: 'main',
      title: `Exit Workflow — ${employee.empName}`,
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

export const apiGetExitWizard = async (req, res, next) => {
  try {
    const state = await getExitWizardState(req.params.employeeId);
    if (!state) return res.status(404).json({ error: 'Employee not found' });
    res.json(state);
  } catch (err) {
    next(err);
  }
};

export const apiSaveFnfSettlement = async (req, res, next) => {
  try {
    const saved = await saveFnfSettlement(req.params.employeeId, req.body, req.user?.id);
    res.json({ message: 'F&F settlement saved', fnfSettlement: saved });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const apiInitiateExitWizard = async (req, res, next) => {
  try {
    const { lastWorkingDay } = req.body;
    if (!lastWorkingDay) {
      return res.status(400).json({ error: 'lastWorkingDay is required' });
    }
    const updated = await initiateExitWithNotifications(
      req.params.employeeId,
      req.body,
      req.user?.id
    );
    res.json({
      message: 'Exit initiated',
      lifecycleStage: updated.lifecycleStage,
      employmentStatus: updated.employmentStatus,
    });
  } catch (err) {
    next(err);
  }
};

export const apiCompleteExitWizard = async (req, res, next) => {
  try {
    const updated = await completeExitWithValidation(req.params.employeeId, req.user?.id, {
      force: req.body.force === true || req.body.force === 'true',
    });
    res.json({
      message: 'Exit completed',
      lifecycleStage: updated.lifecycleStage,
      isActive: updated.isActive,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        error: err.message,
        readiness: err.readiness,
      });
    }
    next(err);
  }
};

export const apiPatchExitChecklist = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items array is required' });
    }
    const result = await updateChecklistWithNotifications(
      req.params.employeeId,
      items,
      req.user?.id
    );
    res.json({ message: 'Checklist updated', ...result });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const apiGetLifecycleAlerts = async (req, res, next) => {
  try {
    const businessId = await resolveOrganizationIdFromRequest(req);
    if (!businessId) return res.json({ counts: {}, probationEnding: [], contractEnding: [], exitsInProgress: [] });
    const summary = await getLifecycleAlertsSummary(businessId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
};
