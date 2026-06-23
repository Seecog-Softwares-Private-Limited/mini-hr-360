// src/routes/employeePortal.routes.js
import { Router } from 'express';
import { verifyEmployee } from '../middleware/employeeAuthMiddleware.js';
import {
  renderEmployeeLogin,
  loginEmployee,
  refreshEmployee,
  logoutEmployee,
} from '../controllers/employee/employeeAuth.controller.js';
import {
  renderEmployeeDashboard,
  getDashboardStats,
  getDashboardOverview,
  getEmployeeProfile,
} from '../controllers/employee/employeeDashboard.controller.js';
import {
  renderProfile,
  renderChangePassword,
  updatePassword,
  forgotPassword,
  renderResetPassword,
  resetPassword,
} from '../controllers/employee/employeeProfile.controller.js';
import {
  renderLeaveList,
  renderApplyLeave,
  submitLeaveApplication,
  cancelLeave,
  getLeaveDetails,
  getLeaveBalances,
  getLeaveRequests,
  validateLeave,
} from '../controllers/employee/employeeLeave.controller.js';

import {
  renderTimesheets,
  renderTasks,
  renderProjects,
  renderGoals,
  renderPerformance,
} from '../controllers/employee/employeeWork.controller.js';
import {
  renderDocumentsVault,
  listDocumentsApi,
  previewDocument,
  downloadDocument,
  getDocumentDetail,
} from '../controllers/employee/employeeDocument.controller.js';

const router = Router();

router.get('/', (req, res) => res.redirect('/login'));

// ===================================
// PUBLIC ROUTES (No Auth Required)
// ===================================

// Employee Login (unified login page)
router.get('/login', renderEmployeeLogin);
router.post('/login', loginEmployee);
router.post('/refresh', refreshEmployee);

// Forgot Password
router.get('/forgot-password', (req, res) => res.render('employee/forgot-password', { layout: 'employee-main', pageClass: 'auth' }));
router.post('/forgot-password', forgotPassword);
router.get('/reset-password/:token', renderResetPassword);
router.post('/reset-password/:token', resetPassword);

// ===================================
// PROTECTED ROUTES (Employee Auth Required)
// ===================================

// Logout
router.get('/logout', verifyEmployee, logoutEmployee);
router.post('/logout', verifyEmployee, logoutEmployee);

// Dashboard
router.get('/dashboard', verifyEmployee, renderEmployeeDashboard);

// My Work
router.get('/work/timesheets', verifyEmployee, renderTimesheets);
router.get('/work/tasks', verifyEmployee, renderTasks);
router.get('/work/projects', verifyEmployee, renderProjects);
router.get('/work/goals', verifyEmployee, renderGoals);
router.get('/work/performance', verifyEmployee, renderPerformance);

// Profile
router.get('/profile', verifyEmployee, renderProfile);
router.get('/change-password', verifyEmployee, renderChangePassword);
router.post('/change-password', verifyEmployee, updatePassword);

// Documents Vault
router.get('/documents', verifyEmployee, renderDocumentsVault);
router.get('/documents/:id/preview', verifyEmployee, previewDocument);
router.get('/documents/:id/download', verifyEmployee, downloadDocument);

// Leave Management - Page Routes
router.get('/leaves', verifyEmployee, renderLeaveList);
router.get('/leaves/apply', verifyEmployee, renderApplyLeave);

// Leave Management - API Routes
router.post('/leaves/apply', verifyEmployee, submitLeaveApplication);
router.post('/leaves/:id/cancel', verifyEmployee, cancelLeave);
router.get('/leaves/:id', verifyEmployee, getLeaveDetails);

// ===================================
// API ROUTES (JSON Response)
// ===================================

// Dashboard API
router.get('/api/dashboard/stats', verifyEmployee, getDashboardStats);
router.get('/api/dashboard/overview', verifyEmployee, getDashboardOverview);
router.get('/api/profile', verifyEmployee, getEmployeeProfile);

// Documents API
router.get('/api/documents', verifyEmployee, listDocumentsApi);
router.get('/api/documents/:id', verifyEmployee, getDocumentDetail);

// Leave API
router.get('/api/leaves/balances', verifyEmployee, getLeaveBalances);
router.get('/api/leaves/list', verifyEmployee, getLeaveRequests);
router.post('/api/leaves/validate', verifyEmployee, validateLeave);

export default router;
export { router as employeePortalRouter };
