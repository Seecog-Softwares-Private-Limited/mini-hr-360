import { Router } from 'express';
import { verifyEmployee } from '../middleware/employeeAuthMiddleware.js';
import {
  attachEmployeePortalContext,
  requirePortalPermission,
} from '../middleware/employeePortalRbac.middleware.js';
import {
  renderTeamDashboard,
  renderTeamLeaves,
  renderTeamAttendance,
  renderTeamCorrections,
  renderTeamReports,
  approveTeamLeave,
  rejectTeamLeave,
  approveTeamCorrection,
  rejectTeamCorrection,
  getTeamDashboardApi,
} from '../controllers/employee/employeeTeam.controller.js';

const router = Router();

router.use(verifyEmployee, attachEmployeePortalContext);

router.get('/', requirePortalPermission('team.dashboard'), renderTeamDashboard);
router.get('/attendance', requirePortalPermission('team.attendance'), renderTeamAttendance);
router.get('/leaves', requirePortalPermission('team.leave'), renderTeamLeaves);
router.get('/corrections', requirePortalPermission('team.corrections'), renderTeamCorrections);
router.get('/reports', requirePortalPermission('team.reports'), renderTeamReports);

router.get('/api/stats', requirePortalPermission('team.dashboard'), getTeamDashboardApi);
router.post('/api/leaves/:id/approve', requirePortalPermission('leave.approve'), approveTeamLeave);
router.post('/api/leaves/:id/reject', requirePortalPermission('leave.approve'), rejectTeamLeave);
router.post('/api/corrections/:id/approve', requirePortalPermission('attendance.approve'), approveTeamCorrection);
router.post('/api/corrections/:id/reject', requirePortalPermission('attendance.approve'), rejectTeamCorrection);

export default router;
