// src/routes/employeePayroll.routes.js
import { Router } from 'express';
import { verifyEmployee } from '../middleware/employeeAuthMiddleware.js';
import { attachEmployeePortalContext } from '../middleware/employeePortalRbac.middleware.js';
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

router.use(verifyEmployee, attachEmployeePortalContext);

// Page Routes
router.get('/payslips', renderMyPayslips);
router.get('/payslips/:id/view', renderPayslipView);
router.get('/bank-tax', renderBankTax);
router.get('/salary-details', renderSalaryDetails);
router.get('/queries', renderPayrollQueries);

// API Routes
router.get('/api/payslips', getMyPayslips);
router.get('/api/payslips/:id', getPayslipDetail);
router.get('/api/bank-tax', getBankAndTaxDetails);
router.put('/api/bank-tax', updateBankAndTaxDetails);
router.get('/api/salary-details', getSalaryDetails);
router.get('/api/queries', getMyPayrollQueries);
router.get('/api/queries/:id', getQueryDetail);
router.post('/api/queries', raisePayrollQuery);

export default router;
export { router as employeePayrollRouter };
