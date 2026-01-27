// src/routes/adminAttendance.routes.js
import { Router } from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';

import {
  getAttendanceDashboard,
  getLogs,
  getReports,
  manualEditLog,
  getPolicies,
  postPolicy,
  patchPolicy,
  removePolicy,
  getShifts,
  postShift,
  patchShift,
  removeShift,
  getHolidays,
  postHoliday,
  patchHoliday,
  removeHoliday,
  getAssignments,
  postAssignments,
  patchAssignment,
  removeAssignment,
  getRegularizations,
  approveRegularizationRequest,
  rejectRegularizationRequest,
  lockAttendancePeriod,
  unlockAttendancePeriod,
  getLockedPeriods,
} from '../controllers/admin/adminAttendance.controller.js';

const router = Router();

router.use(verifyUser);

// ==================== PAGE ROUTES (Render HBS) ====================

// Dashboard
router.get('/', (req, res) => {
  const user = { firstName: req.user.firstName, lastName: req.user.lastName };
  res.render('admin/attendance/dashboard', { 
    title: 'Attendance Dashboard', 
    user, 
    active: 'attendance-dashboard', 
    activeGroup: 'attendance' 
  });
});

// Logs
router.get('/logs', (req, res) => {
  const user = { firstName: req.user.firstName, lastName: req.user.lastName };
  res.render('admin/attendance/logs', { 
    title: 'Attendance Logs', 
    user, 
    active: 'attendance-logs', 
    activeGroup: 'attendance' 
  });
});

// Policies
router.get('/policies', (req, res) => {
  const user = { firstName: req.user.firstName, lastName: req.user.lastName };
  res.render('admin/attendance/policies', { 
    title: 'Attendance Policies', 
    user, 
    active: 'attendance-policies', 
    activeGroup: 'attendance' 
  });
});

// Shifts
router.get('/shifts', (req, res) => {
  const user = { firstName: req.user.firstName, lastName: req.user.lastName };
  res.render('admin/attendance/shifts', { 
    title: 'Shifts', 
    user, 
    active: 'attendance-shifts', 
    activeGroup: 'attendance' 
  });
});

// Holidays
router.get('/holidays', (req, res) => {
  const user = { firstName: req.user.firstName, lastName: req.user.lastName };
  res.render('admin/attendance/holidays', { 
    title: 'Holidays', 
    user, 
    active: 'attendance-holidays', 
    activeGroup: 'attendance' 
  });
});

// Assignments
router.get('/assignments', (req, res) => {
  const user = { firstName: req.user.firstName, lastName: req.user.lastName };
  res.render('admin/attendance/assignments', { 
    title: 'Shift Assignments', 
    user, 
    active: 'attendance-assignments', 
    activeGroup: 'attendance' 
  });
});

// Regularizations
router.get('/regularizations', (req, res) => {
  const user = { firstName: req.user.firstName, lastName: req.user.lastName };
  res.render('admin/attendance/regularizations', { 
    title: 'Regularizations', 
    user, 
    active: 'attendance-regularizations', 
    activeGroup: 'attendance' 
  });
});

// Lock/Unlock
router.get('/lock', (req, res) => {
  const user = { firstName: req.user.firstName, lastName: req.user.lastName };
  res.render('admin/attendance/lock', { 
    title: 'Lock Attendance', 
    user, 
    active: 'attendance-lock', 
    activeGroup: 'attendance' 
  });
});

// Reports
router.get('/reports', (req, res) => {
  const user = { firstName: req.user.firstName, lastName: req.user.lastName };
  res.render('admin/attendance/reports', { 
    title: 'Attendance Reports', 
    user, 
    active: 'attendance-reports', 
    activeGroup: 'attendance' 
  });
});

// ==================== API ROUTES ====================

// Optional: simple health/info endpoint for this module
router.get('/api/health', (req, res) =>
  res.json({
    ok: true,
    module: 'attendance',
    routes: {
      dashboard: '/attendance/api/dashboard',
      logs: '/attendance/api/logs',
      policies: '/attendance/api/policies',
      shifts: '/attendance/api/shifts',
      holidays: '/attendance/api/holidays',
      assignments: '/attendance/api/assignments',
      regularizations: '/attendance/api/regularizations',
      lock: '/attendance/api/lock',
      unlock: '/attendance/api/unlock',
    },
  })
);

// Dashboard & logs (APIs only)
router.get('/api/dashboard', getAttendanceDashboard);
router.get('/api/logs', getLogs);
router.get('/api/reports', getReports);
router.post('/api/logs/manual-edit', manualEditLog);

// Policies
router.get('/api/policies', getPolicies);
router.get('/api/policies/:id', getPolicies);
router.post('/api/policies', postPolicy);
router.patch('/api/policies/:id', patchPolicy);
router.delete('/api/policies/:id', removePolicy);

// Shifts
router.get('/api/shifts', getShifts);
router.post('/api/shifts', postShift);
router.patch('/api/shifts/:id', patchShift);
router.delete('/api/shifts/:id', removeShift);

// Holidays
router.get('/api/holidays', getHolidays);
router.post('/api/holidays', postHoliday);
router.patch('/api/holidays/:id', patchHoliday);
router.delete('/api/holidays/:id', removeHoliday);

// Assignments
router.get('/api/assignments', getAssignments);
router.post('/api/assignments', postAssignments);
router.patch('/api/assignments/:id', patchAssignment);
router.delete('/api/assignments/:id', removeAssignment);

// Regularizations
router.get('/api/regularizations', getRegularizations);
router.patch('/api/regularizations/:id/approve', approveRegularizationRequest);
router.patch('/api/regularizations/:id/reject', rejectRegularizationRequest);

// Lock/unlock
router.post('/api/lock', lockAttendancePeriod);
router.post('/api/unlock', unlockAttendancePeriod);
router.get('/api/locks', getLockedPeriods);

export default router;
export { router as adminAttendanceRouter };
