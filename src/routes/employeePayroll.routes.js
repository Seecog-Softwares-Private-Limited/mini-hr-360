// src/routes/employeePayroll.routes.js
import { Router } from 'express';
import { verifyEmployee } from '../middleware/employeeAuthMiddleware.js';
import {
    renderMyPayslips,
    getMyPayslips,
    getPayslipDetail,
    getBankAndTaxDetails,
    updateBankAndTaxDetails,
    getSalaryDetails,
    raisePayrollQuery,
    getMyPayrollQueries,
    getQueryDetail
} from '../controllers/employee/employeePayroll.controller.js';

import {
    renderBankTax,
    renderSalaryDetails,
    renderPayslipView,
    renderPayrollQueries,
} from '../controllers/employee/employeePayroll.controller.js';

const router = Router();

// ===================================
// PROTECTED ROUTES (Employee Auth Required)
// ===================================

// Page Routes
router.get('/payslips', verifyEmployee, renderMyPayslips);
router.get('/payslips/:id/view', verifyEmployee, renderPayslipView);
router.get('/bank-tax', verifyEmployee, renderBankTax);
router.get('/salary-details', verifyEmployee, renderSalaryDetails);
router.get('/queries', verifyEmployee, renderPayrollQueries);

// API Routes
router.get('/api/payslips', verifyEmployee, getMyPayslips);
router.get('/api/payslips/:id', verifyEmployee, getPayslipDetail);
router.get('/api/bank-tax', verifyEmployee, getBankAndTaxDetails);
router.put('/api/bank-tax', verifyEmployee, updateBankAndTaxDetails);
router.get('/api/salary-details', verifyEmployee, getSalaryDetails);
router.get('/api/queries', verifyEmployee, getMyPayrollQueries);
router.get('/api/queries/:id', verifyEmployee, getQueryDetail);
router.post('/api/queries', verifyEmployee, raisePayrollQuery);

export default router;
export { router as employeePayrollRouter };
