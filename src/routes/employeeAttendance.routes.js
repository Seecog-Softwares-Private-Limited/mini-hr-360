
import { Router } from 'express';
import { verifyEmployee } from '../middleware/employeeAuthMiddleware.js';
import { attachEmployeePortalContext } from '../middleware/employeePortalRbac.middleware.js';
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

router.use(verifyEmployee, attachEmployeePortalContext);

// Page Routes (Render Views)
router.get('/', renderAttendanceDashboard);
router.get('/today', renderAttendanceDashboard);
router.get('/calendar', renderAttendanceCalendar);
router.get('/regularization_form', renderRegularizationForm);
router.get('/regularizations', renderRegularizationList);

// API Pair Routes
router.post('/punch', punch);
router.get('/api/month-summary', getMonthlyAttendance);
router.get('/api/today-summary', getTodaySummary);
router.get('/api/regularizations', getRegularizations);
router.post('/regularization', createRegularizationRequest);

// Shifts endpoint for regularization form
router.get('/api/shifts', async (req, res) => {
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
