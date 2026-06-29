// src/routes/employeePortal.routes.js
import { Router } from 'express';
import { verifyEmployee } from '../middleware/employeeAuthMiddleware.js';
import { attachEmployeePortalContext } from '../middleware/employeePortalRbac.middleware.js';
import {
  renderEmployeeLogin,
  refreshEmployee,
  logoutEmployee,
} from '../controllers/employee/employeeAuth.controller.js';
import { unifiedLogin } from '../controllers/auth/unifiedLogin.controller.js';
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
import {
  renderHrLettersPage,
  listHrLettersApi,
  previewHrLetter,
  downloadHrLetter,
  acknowledgeHrLetter,
  acceptOfferHrLetter,
} from '../controllers/employee/employeeHrLetters.controller.js';

const router = Router();

router.get('/', (req, res) => res.redirect('/login'));

// ===================================
// PUBLIC ROUTES (No Auth Required)
// ===================================

// Employee Login (unified login page)
router.get('/login', renderEmployeeLogin);
router.post('/login', unifiedLogin);
router.post('/refresh', refreshEmployee);

// Forgot Password
router.get('/forgot-password', (req, res) => res.render('employee/forgot-password', { layout: 'employee-main', pageClass: 'auth' }));
router.post('/forgot-password', forgotPassword);
router.get('/reset-password/:token', renderResetPassword);
router.post('/reset-password/:token', resetPassword);

// ===================================
// PROTECTED ROUTES (Employee Auth Required)
// ===================================
router.use(verifyEmployee, attachEmployeePortalContext);

// Logout
router.get('/logout', logoutEmployee);
router.post('/logout', logoutEmployee);

// Dashboard
router.get('/dashboard', renderEmployeeDashboard);

// My Work
router.get('/work/timesheets', renderTimesheets);
router.get('/work/tasks', renderTasks);
router.get('/work/projects', renderProjects);
router.get('/work/goals', renderGoals);
router.get('/work/performance', renderPerformance);

// Profile
router.get('/profile', renderProfile);
router.get('/change-password', renderChangePassword);
router.post('/change-password', updatePassword);

// Documents Vault
router.get('/documents', renderDocumentsVault);
router.get('/documents/:id/preview', previewDocument);
router.get('/documents/:id/download', downloadDocument);

// HR Letters (system-generated)
router.get('/hr-letters', renderHrLettersPage);
router.get('/hr-letters/:id/preview', previewHrLetter);
router.get('/hr-letters/:id/download', downloadHrLetter);
router.post('/hr-letters/:id/acknowledge', acknowledgeHrLetter);
router.post('/hr-letters/:id/accept-offer', acceptOfferHrLetter);

// Leave Management - Page Routes
router.get('/leaves', renderLeaveList);
router.get('/leaves/apply', renderApplyLeave);

// Leave Management - API Routes
router.post('/leaves/apply', submitLeaveApplication);
router.post('/leaves/:id/cancel', cancelLeave);
router.get('/leaves/:id', getLeaveDetails);

// ===================================
// API ROUTES (JSON Response)
// ===================================

// Dashboard API
router.get('/api/dashboard/stats', getDashboardStats);
router.get('/api/dashboard/overview', getDashboardOverview);
router.get('/api/profile', getEmployeeProfile);

// Documents API
router.get('/api/documents', listDocumentsApi);
router.get('/api/documents/:id', getDocumentDetail);
router.get('/api/hr-letters', listHrLettersApi);

// Leave API
router.get('/api/leaves/balances', getLeaveBalances);
router.get('/api/leaves/list', getLeaveRequests);
router.post('/api/leaves/validate', validateLeave);

export default router;
export { router as employeePortalRouter };
