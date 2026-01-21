// src/routes/employeePayroll.routes.js
import { Router } from 'express';
import { verifyEmployee } from '../middleware/employeeAuthMiddleware.js';
import {
    renderMyPayslips,
    getMyPayslips,
    getPayslipDetail,
    getBankAndTaxDetails,
    getSalaryDetails,
    raisePayrollQuery,
    getMyPayrollQueries
} from '../controllers/employee/employeePayroll.controller.js';

const router = Router();

// ===================================
// PROTECTED ROUTES (Employee Auth Required)
// ===================================

// Page Routes
router.get('/payslips', verifyEmployee, renderMyPayslips);

// API Routes
router.get('/api/payslips', verifyEmployee, getMyPayslips);
router.get('/api/payslips/:id', verifyEmployee, getPayslipDetail);
router.get('/api/bank-tax', verifyEmployee, getBankAndTaxDetails);
router.get('/api/salary-details', verifyEmployee, getSalaryDetails);
router.get('/api/queries', verifyEmployee, getMyPayrollQueries);
router.post('/api/queries', verifyEmployee, raisePayrollQuery);

export default router;
export { router as employeePayrollRouter };
