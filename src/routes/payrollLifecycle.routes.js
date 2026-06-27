import express from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';
import {
  apiGetPayrollLinkStatus,
  apiListPayrollRegister,
  apiSalarySlipPrefill,
  apiFnfDraftFromPayroll,
  apiApplyFnfFromPayroll,
  apiSyncPayrollStructure,
} from '../controllers/payrollLifecycle.controller.js';

const router = express.Router();

router.get('/api/v1/employees/:employeeId/payroll-link', verifyUser, apiGetPayrollLinkStatus);
router.get('/api/v1/employees/:employeeId/payroll-register', verifyUser, apiListPayrollRegister);
router.get('/api/v1/employees/:employeeId/payroll-prefill/salary-slip', verifyUser, apiSalarySlipPrefill);
router.get('/api/v1/employees/:employeeId/fnf-settlement/payroll-draft', verifyUser, apiFnfDraftFromPayroll);
router.post(
  '/api/v1/employees/:employeeId/fnf-settlement/from-payroll',
  verifyUser,
  express.json(),
  apiApplyFnfFromPayroll
);
router.post(
  '/api/v1/employees/:employeeId/payroll-structure/sync',
  verifyUser,
  express.json(),
  apiSyncPayrollStructure
);

export default router;
