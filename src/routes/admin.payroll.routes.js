import express from 'express';
import {
  getPayrollSetup,
  savePayrollSetup
} from '../controllers/admin/payroll/payrollsetup.controller.js';

import {
  createSalaryStructure,
  listSalaryStructures,
  assignSalaryStructure
} from '../controllers/admin/payroll/salaryStructure.controller.js';

import {
  createPayrollRun,
  getPayrollRun,
  approvePayrollRun,
  lockPayrollRun
} from '../controllers/admin/payroll/payrollRun.controller.js';

import {
  getPayrollRegister
} from '../controllers/admin/payroll/payrollRegister.controller.js';

import {
  generatePayslips,
  publishPayslips
} from '../controllers/admin/payroll/payslip.controller.js';

import {
  getPFReport,
  getESIReport,
  getPTReport,
  getTDSReport,
} from '../controllers/admin/payroll/statutory.controller.js';

const router = express.Router();

/* Payroll Setup */
router.get('/setup/:businessId', getPayrollSetup);
router.post('/setup', savePayrollSetup);

/* statutory  */

router.get('/statutory/:runId/pf', getPFReport);
router.get('/statutory/:runId/esi', getESIReport);
router.get('/statutory/:runId/pt', getPTReport);
router.get('/statutory/:runId/tds', getTDSReport);

/* Salary Structures */
router.get('/structures/:businessId', listSalaryStructures);
router.post('/structures', createSalaryStructure);
router.post('/structures/assign', assignSalaryStructure);

/* Payroll Runs */
router.post('/runs', createPayrollRun);
router.get('/runs/:id', getPayrollRun);
router.post('/runs/:id/approve', approvePayrollRun);
router.post('/runs/:id/lock', lockPayrollRun);

/* Register */
router.get('/register/:runId', getPayrollRegister);

/* Payslips */
router.post('/payslips/:runId/generate', generatePayslips);
router.post('/payslips/:runId/publish', publishPayslips);

router.get("/__ping", (req, res) => res.json({ ok: true }));


export default router;
