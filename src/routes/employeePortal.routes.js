// src/routes/employeePortal.routes.js
import { Router } from 'express';
import { verifyEmployee } from '../middleware/employeeAuthMiddleware.js';
import {
  renderEmployeeLogin,
  loginEmployee,
  logoutEmployee,
} from '../controllers/employee/employeeAuth.controller.js';
import {
  renderEmployeeDashboard,
  getDashboardStats,
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

const router = Router();

// ===================================
// PUBLIC ROUTES (No Auth Required)
// ===================================

// Employee Login
router.get('/login', renderEmployeeLogin);
router.post('/login', loginEmployee);

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

// Profile
router.get('/profile', verifyEmployee, renderProfile);
router.get('/change-password', verifyEmployee, renderChangePassword);
router.post('/change-password', verifyEmployee, updatePassword);

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
router.get('/api/profile', verifyEmployee, getEmployeeProfile);

// Leave API
router.get('/api/leaves/balances', verifyEmployee, getLeaveBalances);
router.get('/api/leaves/list', verifyEmployee, getLeaveRequests);
router.post('/api/leaves/validate', verifyEmployee, validateLeave);

export default router;
export { router as employeePortalRouter };
