
import { Op } from 'sequelize';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AttendancePunch, AttendanceRegularization, Shift, Holiday, AttendanceLock } from '../../models/index.js';
import {
    recordPunch,
    getToday as getTodayFromService,
    getCalendar as getCalendarFromService,
    getEffectiveAssignment,
} from '../../services/attendance.service.js';

// --- Helpers ---
const getTodayDateString = () => new Date().toISOString().split('T')[0];

// --- Controllers ---

/**
 * GET /employee/attendance - Render My Attendance (Today)
 */
export const renderAttendanceDashboard = asyncHandler(async (req, res) => {
    const employee = req.employee;
    const today = getTodayDateString();

    // Source-of-truth: shared attendance.service.js calculation
    const { summary, punches, assignment } = await getTodayFromService({
        businessId: employee.businessId,
        employeeId: employee.id,
        date: today,
    });

    const shift = assignment?.shift || null;

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

    res.render('employee/attendance/today', {
        title: 'Today\'s Attendance',
        layout: 'employee-main',
        active: 'attendance',
        activeSub: 'attendance_today',
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

    if (!['IN', 'OUT', 'BREAK_START', 'BREAK_END'].includes(type)) {
        return res.status(400).json({ success: false, message: 'Invalid punch type' });
    }

    const { summary } = await recordPunch({
        businessId: employee.businessId,
        employeeId: employee.id,
        date: today,
        punchType: type,
        source: 'WEB',
        metaJson: { latitude, longitude },
    });

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

    const summaries = await getCalendarFromService({
        businessId: employee.businessId,
        employeeId: employee.id,
        month,
    });

    // Fetch holidays for this month
    const { startStr, endStr } = (() => {
        const [y, m] = month.split('-').map(x => Number(x));
        const start = new Date(Date.UTC(y, m - 1, 1));
        const end = new Date(Date.UTC(y, m, 1));
        const startStr = `${month}-01`;
        const endY = end.getUTCFullYear();
        const endM = String(end.getUTCMonth() + 1).padStart(2, '0');
        const endD = String(end.getUTCDate()).padStart(2, '0');
        const endStr = `${endY}-${endM}-${endD}`;
        return { startStr, endStr };
    })();

    const holidays = await Holiday.findAll({
        where: { businessId: employee.businessId, date: { [Op.gte]: startStr, [Op.lt]: endStr } },
        attributes: ['id', 'date', 'name'],
        order: [['date', 'ASC']]
    });

    return res.json({ 
        success: true, 
        data: summaries,
        holidays: holidays.map(h => ({ date: h.date, name: h.name }))
    });
});

/**
 * GET /employee/attendance/regularization
 */
export const renderRegularizationList = asyncHandler(async (req, res) => {
    const employee = req.employee;

    const requests = await AttendanceRegularization.findAll({
        where: { employeeId: employee.id, businessId: employee.businessId },
        order: [['createdAt', 'DESC']]
    });

    res.render('employee/attendance/regularizations', {
        title: 'Regularization Requests',
        layout: 'employee-main',
        active: 'attendance',
        employee,
        requests
    });
});

/**
 * GET /employee/attendance/regularization_form
 */
export const renderRegularizationForm = asyncHandler(async (req, res) => {
    const employee = req.employee;
    
    // Fetch all shifts for this business
    const shifts = await Shift.findAll({
        where: { businessId: employee.businessId, status: 'ACTIVE' },
        attributes: ['id', 'name', 'startTime', 'endTime'],
        order: [['name', 'ASC']]
    });

    res.render('employee/attendance/regularization_form', {
        title: 'Request Regularization',
        layout: 'employee-main',
        active: 'attendance',
        employee,
        shifts: shifts.map(s => ({ id: s.id, name: s.name, startTime: s.startTime, endTime: s.endTime }))
    });
});

/**
 * POST /api/employee/attendance/regularization
 * Body: { date, type, reason, correction: { punchIn, punchOut }, file (optional) }
 */
export const createRegularizationRequest = asyncHandler(async (req, res) => {
    // Handle FormData - fields come as form fields, file comes as req.file
    const { date, type, reason, correction } = req.body;
    const employee = req.employee;

    // Debug logging
    console.log('createRegularizationRequest - Received data:', {
        date,
        type,
        reason,
        correction,
        bodyKeys: Object.keys(req.body || {}),
        hasFile: !!req.file
    });

    if (!date || !type || !reason) {
        console.log('Missing fields validation failed:', { date: !!date, type: !!type, reason: !!reason });
        return res.status(400).json({ 
            success: false, 
            message: 'Missing required fields: date, type, reason',
            received: { date, type, reason }
        });
    }

    try {
        const correctionData = typeof correction === 'string' ? JSON.parse(correction) : (correction || {});

        const request = await AttendanceRegularization.create({
            businessId: employee.businessId,
            employeeId: employee.id,
            date,
            type,
            reason,
            requestedChangeJson: correctionData,
            status: 'PENDING'
        });

        console.log('Regularization request created successfully:', request.id);
        return res.json({ success: true, message: 'Request submitted successfully', request });
    } catch (error) {
        console.error('createRegularizationRequest error:', error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/employee/attendance/api/today-summary
 * Returns today's attendance summary with punches
 */
export const getTodaySummary = asyncHandler(async (req, res) => {
    const employee = req.employee;
    const today = new Date().toISOString().split('T')[0];

    try {
        // Check if attendance period is locked
        const yearMonth = today.substring(0, 7); // YYYY-MM
        const attendanceLock = await AttendanceLock.findOne({
            where: {
                businessId: employee.businessId,
                period: yearMonth,
            }
        });

        const { summary, punches, assignment } = await getTodayFromService({
            businessId: employee.businessId,
            employeeId: employee.id,
            date: today,
        });

        // Extract location from first punch's latitude/longitude (if present)
        let location = 'Unknown';
        let locationName = null;
        let coords = null;
        const firstPunch = punches?.[0];
        if (firstPunch?.metaJson) {
            const meta = typeof firstPunch.metaJson === 'string' ? JSON.parse(firstPunch.metaJson) : firstPunch.metaJson;
            if (meta?.latitude && meta?.longitude) {
                coords = { latitude: Number(meta.latitude), longitude: Number(meta.longitude) };
                location = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;

                // Best-effort reverse geocode (non-blocking style; failure falls back to coords)
                try {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 1200);
                    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`;
                    const resp = await fetch(url, {
                        signal: controller.signal,
                        headers: { 'User-Agent': 'mini-hr-360/attendance' },
                    });
                    clearTimeout(timeout);
                    if (resp.ok) {
                        const json = await resp.json();
                        locationName = json?.display_name || null;
                    }
                } catch (_) {
                    // ignore
                }
            }
        }

        const shift = assignment?.shift ? {
            name: assignment.shift.name,
            startTime: assignment.shift.startTime,
            endTime: assignment.shift.endTime
        } : null;

        return res.json({
            success: true,
            summary: {
                status: summary?.status || 'NOT_MARKED',
                firstInAt: summary?.firstInAt || null,
                lastOutAt: summary?.lastOutAt || null,
                location, // coords string fallback
                locationName,
                ip: req.ip,
                date: today
            },
            shift,
            isLocked: !!attendanceLock,
            lockMessage: attendanceLock ? `Attendance for ${yearMonth} is locked by admin` : null,
            punches: (punches || []).map(p => {
                let locStr = 'Unknown';
                if (p.metaJson) {
                    const meta = typeof p.metaJson === 'string' ? JSON.parse(p.metaJson) : p.metaJson;
                    if (meta?.latitude && meta?.longitude) locStr = `${Number(meta.latitude).toFixed(4)}, ${Number(meta.longitude).toFixed(4)}`;
                }
                return {
                    punchAt: p.punchAt,
                    punchType: p.punchType,
                    type: p.punchType,
                    location: locStr
                };
            })
        });
    } catch (error) {
        console.error('getTodaySummary error:', error.message);
        return res.json({
            success: true,
            summary: {
                status: 'Not Marked',
                firstInAt: null,
                lastOutAt: null,
                location: 'Unknown',
                date: today
            },
            isLocked: false,
            punches: []
        });
    }
});

/**
 * GET /api/employee/attendance/api/regularizations
 * Returns all regularization requests for the employee
 */
export const getRegularizations = asyncHandler(async (req, res) => {
    const employee = req.employee;

    try {
        const regularizations = await AttendanceRegularization.findAll({
            where: {
                employeeId: employee.id,
                businessId: employee.businessId
            },
            order: [['date', 'DESC']],
        });

        const mapped = await Promise.all(regularizations.map(async (reg) => {
            // find effective assignment for that date
            const assignment = await getEffectiveAssignment({ businessId: employee.businessId, employeeId: employee.id, date: reg.date });
            const shiftObj = assignment?.shift ? { name: assignment.shift.name, startTime: assignment.shift.startTime, endTime: assignment.shift.endTime } : null;
            return {
                id: reg.id,
                date: reg.date,
                attendanceDate: reg.date,
                type: reg.type,
                reason: reg.reason,
                status: reg.status,
                shift: shiftObj ? shiftObj.name : 'Unknown',
                shiftObj
            };
        }));

        return res.json({ success: true, data: mapped });
    } catch (error) {
        console.error('getRegularizations error:', error.message);
        return res.json({
            success: true,
            data: []
        });
    }
});

export default {
    renderAttendanceDashboard,
    punch,
    renderAttendanceCalendar,
    getMonthlyAttendance,
    renderRegularizationList,
    renderRegularizationForm,
    createRegularizationRequest,
    getTodaySummary,
    getRegularizations
};
