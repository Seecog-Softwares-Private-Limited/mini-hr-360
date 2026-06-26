// src/routes/employee.routes.js
import express from 'express';
import {
    renderEmployeesPage,
    listEmployees,
    createEmployee,
    getEmployeeById,
    updateEmployee,
    updateEmployeeStatus,
    deleteEmployee,
    resetEmployeePortalAccess,
    sendEmployeePortalCredentials,
    sendEmployeePortalCredentialsEmail,
} from '../controllers/employee.controllers.js';
import { verifyUser } from '../middleware/authMiddleware.js';
import { attachWorkspaceContext } from '../middleware/workspaceMiddleware.js';

const router = express.Router();

// This router is mounted at `/` in app.js. Without a path guard, router-level
// verifyUser would run for every request (including POST /employee/login).
const HR_EMPLOYEE_ROUTE = /^\/(?:employees|api\/v1\/employees)(?:\/|$)/;

router.use((req, res, next) => {
    if (!HR_EMPLOYEE_ROUTE.test(req.path)) {
        return next('router');
    }
    next();
});

router.use(verifyUser, attachWorkspaceContext);

// HTML page
router.get('/employees', renderEmployeesPage);

// JSON APIs
router.get('/api/v1/employees', listEmployees);
router.post('/api/v1/employees', createEmployee);
router.get('/api/v1/employees/:id', getEmployeeById);
router.put('/api/v1/employees/:id', updateEmployee);
router.patch('/api/v1/employees/:id/status', updateEmployeeStatus);
router.post('/api/v1/employees/:id/portal-access/reset', resetEmployeePortalAccess);
router.post('/api/v1/employees/:id/portal-access/send', sendEmployeePortalCredentials);
router.post('/api/v1/employees/:id/portal-access/send-email', sendEmployeePortalCredentialsEmail);
router.delete('/api/v1/employees/:id', deleteEmployee);

export default router;
