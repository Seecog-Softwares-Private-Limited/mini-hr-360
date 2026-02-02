
import { Op } from 'sequelize';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
    AttendanceDailySummary,
    AttendancePunch,
    AttendancePolicy,
    Shift,
    EmployeeShiftAssignment,
    AttendanceRegularization,
    Holiday,
    Business
} from '../../models/index.js';

// --- Helpers ---

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const getActiveShift = async (employeeId, date) => {
    // Find assignment active on this date
    const assignment = await EmployeeShiftAssignment.findOne({
        where: {
            employeeId,
            effectiveFrom: { [Op.lte]: date },
            [Op.or]: [
                { effectiveTo: { [Op.gte]: date } },
                { effectiveTo: null }
            ]
        },
        include: [{ model: Shift, as: 'shift' }, { model: AttendancePolicy, as: 'policy' }],
        order: [['effectiveFrom', 'DESC']], // Get most recent assignment
    });
    return assignment;
};

// --- Controllers ---

/**
 * GET /employee/attendance - Render My Attendance (Today)
 */
export const renderAttendanceDashboard = asyncHandler(async (req, res) => {
    const employee = req.employee;
    const today = getTodayDateString();

    // 1. Get Today's Summary
    let summary = await AttendanceDailySummary.findOne({
        where: { employeeId: employee.id, date: today }
    });

    // 2. Get Punches
    const punches = await AttendancePunch.findAll({
        where: { employeeId: employee.id, date: today },
        order: [['punchAt', 'ASC']]
    });

    // 3. Get Shift Info
    const assignment = await getActiveShift(employee.id, today);
    const shift = assignment?.shift;

    // 4. Determine UI State
    let status = 'Not Started';
    if (summary) {
        if (summary.lastOutAt && summary.firstInAt && summary.lastOutAt > summary.firstInAt) {
            status = 'Completed'; // Simplified
        } else if (summary.firstInAt) {
            status = 'Working';
        }
    } else {
        // Check if holiday/leave
        // TODO: Check holidays table
    }

    // Format punches for view
    const formattedPunches = punches.map(p => ({
        ...p.toJSON(),
        time: new Date(p.punchAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    res.render('employee/attendance/my-attendance', {
        title: 'My Attendance',
        layout: 'employee-main',
        active: 'attendance',
        activeSub: 'my-attendance', // Helper for sidebar execution
        employee,
        todayDate: new Date().toDateString(),
        summary,
        punches: formattedPunches,
        shift: shift ? {
            name: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime
        } : null,
        status
    });
});

/**
 * POST /api/employee/attendance/punch
 * Body: { type: 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END', latitude, longitude }
 */
export const punch = asyncHandler(async (req, res) => {
    const { type, latitude, longitude } = req.body;
    const employee = req.employee;
    const today = getTodayDateString();
    const now = new Date();

    if (!['IN', 'OUT', 'BREAK_START', 'BREAK_END'].includes(type)) {
        return res.status(400).json({ success: false, message: 'Invalid punch type' });
    }

    // Find or Create Daily Summary
    let summary = await AttendanceDailySummary.findOne({
        where: { employeeId: employee.id, date: today }
    });

    if (!summary) {
        summary = await AttendanceDailySummary.create({
            businessId: employee.businessId,
            employeeId: employee.id,
            date: today,
            status: 'ABSENT', // Will update below
            source: 'AUTO'
        });
    }

    // Prevent double IN
    if (type === 'IN' && summary.firstInAt) {
        return res.status(400).json({ success: false, message: 'Already punched IN today' });
    }

    // Save Punch
    await AttendancePunch.create({
        businessId: employee.businessId,
        employeeId: employee.id,
        date: today,
        punchType: type,
        punchAt: now,
        source: 'WEB', // Assuming web portal
        metaJson: { latitude, longitude }
    });

    // Update Summary
    if (type === 'IN') {
        if (!summary.firstInAt) {
            summary.firstInAt = now;
            summary.status = 'PRESENT';

            // Calculate Late Minutes (if shift exists)
            const assignment = await getActiveShift(employee.id, today);
            const shift = assignment?.shift;
            if (shift && shift.startTime) { // Format HH:mm:ss
                // Construct Shift Start Date object
                const [h, m] = shift.startTime.split(':');
                const shiftStart = new Date(now);
                shiftStart.setHours(h, m, 0, 0);

                // Add grace period if any (from policy)
                const policy = assignment.policy;
                const graceMins = policy?.gracePeriodMinutes || 0;
                shiftStart.setMinutes(shiftStart.getMinutes() + graceMins);

                if (now > shiftStart) {
                    const diffMs = now - shiftStart;
                    summary.lateMinutes = Math.floor(diffMs / 60000);
                }
            }
        }
    } else if (type === 'OUT') {
        summary.lastOutAt = now;

        // Calculate Work Hours
        if (summary.firstInAt) {
            const diffMs = now - new Date(summary.firstInAt);
            const diffMins = Math.floor(diffMs / 60000);
            summary.workMinutes = diffMins - (summary.breakMinutes || 0);

            // Calculate Overtime (if workMinutes > shift duration)
            const assignment = await getActiveShift(employee.id, today);
            const shift = assignment?.shift;
            if (shift && shift.startTime && shift.endTime) {
                const [sh, sm] = shift.startTime.split(':');
                const [eh, em] = shift.endTime.split(':');

                // Simple duration calc assuming same day shift for now
                let startMin = parseInt(sh) * 60 + parseInt(sm);
                let endMin = parseInt(eh) * 60 + parseInt(em);
                let shiftDuration = endMin - startMin; // minutes
                if (shiftDuration < 0) shiftDuration += 24 * 60; // Overnight shift

                if (summary.workMinutes > shiftDuration) {
                    summary.overtimeMinutes = summary.workMinutes - shiftDuration;
                }
            }
        }
    } else if (type === 'BREAK_START') {
        // Store break start time - just record the punch
        // The actual break duration will be calculated when BREAK_END is punched
    } else if (type === 'BREAK_END') {
        // Calculate break duration and add to breakMinutes
        // Find the last BREAK_START punch for today
        const breakStartPunch = await AttendancePunch.findOne({
            where: {
                employeeId: employee.id,
                date: today,
                punchType: 'BREAK_START'
            },
            order: [['punchAt', 'DESC']]
        });

        if (breakStartPunch) {
            const breakDuration = Math.floor((now - new Date(breakStartPunch.punchAt)) / 60000);
            summary.breakMinutes = (summary.breakMinutes || 0) + breakDuration;

            // Recalculate work minutes excluding breaks if already clocked out
            if (summary.firstInAt && summary.lastOutAt) {
                const totalMinutes = Math.floor((new Date(summary.lastOutAt) - new Date(summary.firstInAt)) / 60000);
                summary.workMinutes = totalMinutes - summary.breakMinutes;
            }
        }
    }

    await summary.save();

    return res.json({ success: true, message: 'Punch recorded', summary });
});


/**
 * GET /employee/attendance/calendar - Render Calendar View
 */
export const renderAttendanceCalendar = asyncHandler(async (req, res) => {
    res.render('employee/attendance/calendar', {
        title: 'Attendance Calendar',
        layout: 'employee-main',
        active: 'attendance',
        activeSub: 'calendar',
        employee: req.employee
    });
});

/**
 * GET /api/employee/attendance/month-summary
 * Query: month (YYYY-MM), default current
 */
export const getMonthlyAttendance = asyncHandler(async (req, res) => {
    const employee = req.employee;
    let { month } = req.query;
    if (!month) month = getTodayDateString().substring(0, 7); // YYYY-MM

    // Get all summaries for month
    const summaries = await AttendanceDailySummary.findAll({
        where: {
            employeeId: employee.id,
            date: { [Op.like]: `${month}%` }
        }
    });

    return res.json({ success: true, data: summaries });
});

/**
 * GET /employee/attendance/regularization
 */
export const renderRegularizationList = asyncHandler(async (req, res) => {
    const employee = req.employee;

    const requests = await AttendanceRegularization.findAll({
        where: { employeeId: employee.id },
        order: [['createdAt', 'DESC']]
    });

    res.render('employee/attendance/regularization-list', {
        title: 'Regularization Requests',
        layout: 'employee-main',
        active: 'attendance',
        activeSub: 'regularization',
        employee,
        requests: requests.map(r => r.toJSON())
    });
});

/**
 * POST /api/employee/attendance/regularization
 * Body: { date, type, reason, correction: { punchIn, punchOut } }
 */
export const createRegularizationRequest = asyncHandler(async (req, res) => {
    const { date, type, reason, correction } = req.body;
    const employee = req.employee;

    if (!date || !type || !reason) {
        return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    const request = await AttendanceRegularization.create({
        businessId: employee.businessId,
        employeeId: employee.id,
        date,
        type,
        reason,
        requestedChangeJson: correction,
        status: 'PENDING'
    });

    return res.json({ success: true, message: 'Request submitted', request });
});

export default {
    renderAttendanceDashboard,
    punch,
    renderAttendanceCalendar,
    getMonthlyAttendance,
    renderRegularizationList,
    createRegularizationRequest
};
