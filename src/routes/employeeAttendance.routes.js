
import { Router } from 'express';
import { verifyEmployee } from '../middleware/employeeAuthMiddleware.js';
import {
    renderAttendanceDashboard,
    punch,
    renderAttendanceCalendar,
    getMonthlyAttendance,
    renderRegularizationList,
    createRegularizationRequest
} from '../controllers/employee/employeeAttendance.controller.js';

const router = Router();

// Page Routes (Render Views)
router.get('/', verifyEmployee, renderAttendanceDashboard); // /employee/attendance
router.get('/calendar', verifyEmployee, renderAttendanceCalendar); // /employee/attendance/calendar
router.get('/regularization', verifyEmployee, renderRegularizationList); // /employee/attendance/regularization

// API Pair Routes
router.post('/punch', verifyEmployee, punch);
router.get('/api/month-summary', verifyEmployee, getMonthlyAttendance);
router.post('/regularization', verifyEmployee, createRegularizationRequest);

export const employeeAttendanceRouter = router;
export default router;
