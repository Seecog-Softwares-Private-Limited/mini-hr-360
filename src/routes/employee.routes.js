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
    sendEmployeePortalCredentialsEmail,
} from '../controllers/employee.controllers.js';
import { verifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// HTML page
router.get('/employees', verifyUser, renderEmployeesPage);

// JSON APIs
router.get('/api/v1/employees', verifyUser, listEmployees);
router.post('/api/v1/employees', verifyUser, createEmployee);
router.get('/api/v1/employees/:id', verifyUser, getEmployeeById);
router.put('/api/v1/employees/:id', verifyUser, updateEmployee);
router.patch('/api/v1/employees/:id/status', verifyUser, updateEmployeeStatus);
router.post('/api/v1/employees/:id/portal-access/reset', verifyUser, resetEmployeePortalAccess);
router.post('/api/v1/employees/:id/portal-access/send-email', verifyUser, sendEmployeePortalCredentialsEmail);
router.delete('/api/v1/employees/:id', verifyUser, deleteEmployee);

export default router;
