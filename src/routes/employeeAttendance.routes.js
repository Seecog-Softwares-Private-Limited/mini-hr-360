
import { Router } from 'express';
import { verifyEmployee } from '../middleware/employeeAuthMiddleware.js';
import {
    renderAttendanceDashboard,
    punch,
    renderAttendanceCalendar,
    getMonthlyAttendance,
    renderRegularizationList,
    renderRegularizationForm,
    createRegularizationRequest,
    getTodaySummary,
    getRegularizations
} from '../controllers/employee/employeeAttendance.controller.js';

const router = Router();

// Page Routes (Render Views)
router.get('/', verifyEmployee, renderAttendanceDashboard); // /employee/attendance
router.get('/today', verifyEmployee, renderAttendanceDashboard); // /employee/attendance/today (alias)
router.get('/calendar', verifyEmployee, renderAttendanceCalendar); // /employee/attendance/calendar
router.get('/regularization_form', verifyEmployee, renderRegularizationForm); // /employee/attendance/regularization_form
router.get('/regularizations', verifyEmployee, renderRegularizationList); // /employee/attendance/regularizations

// API Pair Routes
router.post('/punch', verifyEmployee, punch);
router.get('/api/month-summary', verifyEmployee, getMonthlyAttendance);
router.get('/api/today-summary', verifyEmployee, getTodaySummary);
router.get('/api/regularizations', verifyEmployee, getRegularizations);
router.post('/regularization', verifyEmployee, createRegularizationRequest);

// Shifts endpoint for regularization form
router.get('/api/shifts', verifyEmployee, async (req, res) => {
    try {
        const { Shift } = await import('../models/index.js');
        const shifts = await Shift.findAll({
            where: { businessId: req.employee.businessId, status: 'ACTIVE' },
            attributes: ['id', 'name', 'startTime', 'endTime'],
            order: [['name', 'ASC']]
        });
        return res.json({ success: true, data: shifts });
    } catch (error) {
        console.error('Error fetching shifts:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch shifts' });
    }
});

export const employeeAttendanceRouter = router;
export default router;
