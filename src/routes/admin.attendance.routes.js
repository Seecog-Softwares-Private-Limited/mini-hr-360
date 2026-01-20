// src/routes/adminAttendance.routes.js
import { Router } from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';

import {
  getAttendanceDashboard,
  getLogs,
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
  removeHoliday,
  getAssignments,
  postAssignments,
  getRegularizations,
  approveRegularizationRequest,
  rejectRegularizationRequest,
  lockAttendancePeriod,
  unlockAttendancePeriod,
} from '../controllers/admin/adminAttendance.controller.js';

const router = Router();

router.use(verifyUser);

// APIs only (no HBS rendering)

// Optional: simple health/info endpoint for this module
router.get('/', (req, res) =>
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

// APIs
router.get('/api/dashboard', getAttendanceDashboard);
router.get('/api/logs', getLogs);
router.post('/api/logs/manual-edit', manualEditLog);

// Policies
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
router.delete('/api/holidays/:id', removeHoliday);

// Assignments
router.get('/api/assignments', getAssignments);
router.post('/api/assignments', postAssignments);

// Regularizations
router.get('/api/regularizations', getRegularizations);
router.patch('/api/regularizations/:id/approve', approveRegularizationRequest);
router.patch('/api/regularizations/:id/reject', rejectRegularizationRequest);

// Lock/unlock
router.post('/api/lock', lockAttendancePeriod);
router.post('/api/unlock', unlockAttendancePeriod);

export default router;
export { router as adminAttendanceRouter };
