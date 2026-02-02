import express from 'express';
import {
  getPayrollSetup,
  savePayrollSetup,
  testPayment
} from '../controllers/admin/payroll/payrollsetup.controller.js';
import { verifyOwner, verifyUser } from '../middleware/authMiddleware.js';

import {
  createSalaryStructure,
  listSalaryStructures,
  assignSalaryStructure,
  getSalaryStructure,
  updateSalaryStructure,
  deleteSalaryStructure,
  getStructureAssignments,
  unassignStructureEmployees
} from '../controllers/admin/payroll/salaryStructure.controller.js';

import {
  listPayrollRuns,
  createPayrollRun,
  getPayrollRun,
  approvePayrollRun,
  lockPayrollRun,
  updatePayrollRun,
  deletePayrollRun,
  pullInputs,
  initializePayrollRun,
  calculatePayroll,
  recalculatePayroll,
  publishPayrollRun,
  processPayments,
  getPaymentStatus,
  generateBankFile,
  getPayoutConfig
} from '../controllers/admin/payroll/payrollRun.controller.js';

import {
  getPayrollRegister,
  addAdjustment
} from '../controllers/admin/payroll/payrollRegister.controller.js';

import {
  generatePayslips,
  generateAllPayslips,
  publishPayslips,
  listPayslips,
  getPayslipPreview,
  downloadPayslip
} from '../controllers/admin/payroll/payslip.controller.js';

import {
  getPFReport,
  getESIReport,
  getPTReport,
  getTDSReport,
  getSummary,
  getComplianceStatus,
  updateComplianceStatus,
} from '../controllers/admin/payroll/statutory.controller.js';

const router = express.Router();

// Apply verifyUser to all payroll API routes
router.use(verifyUser);

/* Payroll Setup */
router.get('/setup/:businessId', getPayrollSetup);
router.post('/setup', savePayrollSetup);
router.post('/test-payment', testPayment);

/* statutory  */

router.get('/statutory/:runId/pf', getPFReport);
router.get('/statutory/:runId/esi', getESIReport);
router.get('/statutory/:runId/pt', getPTReport);
router.get('/statutory/:runId/tds', getTDSReport);
router.get('/statutory/:runId/summary', getSummary);
router.get('/statutory/:runId/compliance', getComplianceStatus);
router.post('/statutory/:runId/compliance', updateComplianceStatus);

/* Salary Structures */
// List all structures - using /list suffix to avoid route conflict with /:id
router.get('/structures/list/:businessId', listSalaryStructures);
// Also support query param for listing: /structures?businessId=26
router.get('/structures', listSalaryStructures);
router.post('/structures', createSalaryStructure);
router.post('/structures/assign', assignSalaryStructure);
router.get('/structures/:id', getSalaryStructure);
router.put('/structures/:id', updateSalaryStructure);
router.delete('/structures/:id', deleteSalaryStructure);
router.get('/structures/:id/assignments', getStructureAssignments);
router.post('/structures/:id/unassign', unassignStructureEmployees);

/* Payroll Runs */
router.get('/runs', listPayrollRuns);
router.post('/runs', createPayrollRun);
router.post('/runs/pull-inputs', pullInputs);
router.post('/runs/initialize', initializePayrollRun);
router.get('/runs/:id', getPayrollRun);
router.put('/runs/:id', updatePayrollRun);
router.delete('/runs/:id', deletePayrollRun);
router.post('/runs/:id/calculate', calculatePayroll);
router.post('/runs/:id/recalculate', recalculatePayroll);
router.post('/runs/:id/approve', approvePayrollRun);
router.post('/runs/:id/lock', lockPayrollRun);
router.post('/runs/:id/publish', publishPayrollRun);
// Payment processing routes
router.post('/runs/:id/process-payments', processPayments);
router.get('/runs/:id/payment-status', getPaymentStatus);
router.get('/runs/:id/bank-file', generateBankFile);
router.get('/payout-config', getPayoutConfig);
// Unlock - only shop_owner or admin
router.post('/runs/:id/unlock', verifyOwner, (req, res, next) => {
  // delegate to controller (controller uses resolveBusinessId so req.user must be set)
  return (async () => await import('../controllers/admin/payroll/payrollRun.controller.js'))().then(mod => mod.unlockPayrollRun(req, res, next)).catch(next);
});

/* Register */
router.get('/register/:runId', getPayrollRegister);
router.post('/register/adjustment', addAdjustment);

/* Payslips */
router.get('/payslips/:runId', listPayslips);
router.post('/payslips/:runId/generate', generatePayslips);
router.post('/payslips/:runId/publish', publishPayslips);
// Create run + generate payslips for all employees for current period
router.post('/payslips/generate-all', generateAllPayslips);
router.get('/payslips/preview/:id', getPayslipPreview);
router.get('/payslips/download/:id', downloadPayslip);

router.get("/__ping", (req, res) => res.json({ ok: true }));


export default router;
