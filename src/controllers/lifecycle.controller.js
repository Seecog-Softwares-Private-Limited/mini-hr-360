import {
  getEmployeeLifecycleOverview,
  applyIncrementCtc,
  convertInternToPermanent,
  transitionLifecycleStage,
  validateDocumentGates,
  isDocumentAllowed,
  syncPayrollForEmployee,
  acceptEmployeeOffer,
  confirmEmployeeEmployment,
} from '../services/employeeLifecycle.service.js';
import {
  initiateExitWithNotifications,
  completeExitWithValidation,
  updateChecklistWithNotifications,
} from '../services/exitWorkflow.service.js';
import { listDocumentVersionHistory } from '../services/generatedDocument.service.js';
import Employee from '../models/Employee.js';

async function findEmployee(req, employeeId) {
  const id = Number(employeeId);
  if (!id) return null;
  return Employee.findByPk(id);
}

export const getLifecycle = async (req, res, next) => {
  try {
    const overview = await getEmployeeLifecycleOverview(req.params.id);
    if (!overview) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    return res.json(overview);
  } catch (err) {
    next(err);
  }
};

export const patchLifecycleStage = async (req, res, next) => {
  try {
    const employee = await findEmployee(req, req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const { stage } = req.body;
    if (!stage) return res.status(400).json({ error: 'stage is required' });

    const updated = await transitionLifecycleStage(employee, stage, {
      action: 'manual_stage_update',
      actorUserId: req.user?.id,
      payload: req.body,
    });

    return res.json({
      message: 'Lifecycle stage updated',
      lifecycleStage: updated.lifecycleStage,
    });
  } catch (err) {
    if (err.message?.includes('Invalid lifecycle')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
};

export const postInitiateExit = async (req, res, next) => {
  try {
    const { resignationDate, lastWorkingDay, noticePeriodDays, exitReason, exitType, exitCategory } =
      req.body;

    if (!lastWorkingDay) {
      return res.status(400).json({ error: 'lastWorkingDay is required' });
    }

    const updated = await initiateExitWithNotifications(
      req.params.id,
      {
        resignationDate,
        lastWorkingDay,
        noticePeriodDays,
        exitReason,
        exitType,
        exitCategory,
      },
      req.user?.id
    );

    return res.json({
      message: 'Exit initiated',
      lifecycleStage: updated.lifecycleStage,
      employmentStatus: updated.employmentStatus,
    });
  } catch (err) {
    next(err);
  }
};

export const postCompleteExit = async (req, res, next) => {
  try {
    const updated = await completeExitWithValidation(req.params.id, req.user?.id, {
      force: req.body?.force === true || req.body?.force === 'true',
    });
    return res.json({
      message: 'Exit completed',
      lifecycleStage: updated.lifecycleStage,
      isActive: updated.isActive,
    });
  } catch (err) {
    next(err);
  }
};

export const postApplyIncrementCtc = async (req, res, next) => {
  try {
    const { revisedAnnualCtc, effectiveDate } = req.body;
    if (revisedAnnualCtc == null) {
      return res.status(400).json({ error: 'revisedAnnualCtc is required' });
    }

    const result = await applyIncrementCtc(
      req.params.id,
      revisedAnnualCtc,
      effectiveDate,
      req.user?.id
    );

    return res.json({
      message: 'CTC updated',
      empCtc: result.employee.empCtc,
      empIncrementEffectiveDate: result.employee.empIncrementEffectiveDate,
      payrollSync: result.payrollSync,
    });
  } catch (err) {
    next(err);
  }
};

export const postConvertIntern = async (req, res, next) => {
  try {
    const updated = await convertInternToPermanent(
      req.params.id,
      req.body,
      req.user?.id
    );
    return res.json({
      message: 'Intern converted to permanent',
      employeeType: updated.employeeType,
      lifecycleStage: updated.lifecycleStage,
    });
  } catch (err) {
    next(err);
  }
};

export const validateDocumentForEmployee = async (req, res, next) => {
  try {
    const employee = await findEmployee(req, req.params.employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const code = req.query.code || req.body?.code;
    if (!code) return res.status(400).json({ error: 'code is required' });

    const gates = validateDocumentGates(employee, code);
    const allowed = isDocumentAllowed(employee, code);

    return res.json({ ...gates, allowed });
  } catch (err) {
    next(err);
  }
};

export const patchOffboardingChecklist = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const result = await updateChecklistWithNotifications(
      req.params.id,
      items,
      req.user?.id
    );

    return res.json({
      message: 'Checklist updated',
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

export const postSyncPayroll = async (req, res, next) => {
  try {
    const result = await syncPayrollForEmployee(req.params.id, req.body);
    return res.json({
      message: 'Payroll structure synced',
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

export const postAcceptOffer = async (req, res, next) => {
  try {
    const updated = await acceptEmployeeOffer(req.params.id, req.body, req.user?.id);
    return res.json({
      message: 'Offer accepted — employee moved to joining',
      lifecycleStage: updated.lifecycleStage,
      empDateOfJoining: updated.empDateOfJoining,
    });
  } catch (err) {
    if (err.statusCode === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
};

export const postConfirmEmployment = async (req, res, next) => {
  try {
    const updated = await confirmEmployeeEmployment(req.params.id, req.body, req.user?.id);
    return res.json({
      message: 'Employment confirmed',
      lifecycleStage: updated.lifecycleStage,
      confirmationDate: updated.confirmationDate,
      employmentStatus: updated.employmentStatus,
    });
  } catch (err) {
    if (err.statusCode === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
};

export const getDocumentVersionHistory = async (req, res, next) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).json({ error: 'code query parameter is required' });

    const versions = await listDocumentVersionHistory(Number(req.params.id), code);
    return res.json({ code, versions });
  } catch (err) {
    next(err);
  }
};
