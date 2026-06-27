import { Op } from 'sequelize';
import {
  Employee,
  LeaveRequest,
  LeaveType,
  PayrollRun,
  PayrollQuery,
  AttendanceDailySummary,
  AttendanceRegularization,
  Notification,
  Candidate,
  DocumentApprovalRequest,
  EmployeeGeneratedDocument,
} from '../models/index.js';
import { getDashboard as getAttendanceDashboard } from './attendance.service.js';
import { getLifecycleAlertsSummary } from './lifecycleAlerts.service.js';

const ACTIVE_STATUSES = ['Active', 'ACTIVE', 'active'];

export function emptyWidgets() {
  const today = new Date().toISOString().split('T')[0];
  return {
    employees: { total: 0, active: 0, inactive: 0 },
    payroll: { latestRun: null, pendingQueries: 0 },
    leaves: { pending: 0, approved: 0, rejected: 0, canceled: 0 },
    attendance: {
      date: today,
      present: 0,
      absent: 0,
      late: 0,
      onLeave: 0,
      total: 0,
      pendingRegularizations: 0,
    },
    tasks: { pending: 0, completed: 0, total: 0 },
    lifecycle: {
      offersPending: 0,
      exitsInProgress: 0,
      probationEndingSoon: 0,
      contractEndingSoon: 0,
      candidatesProspect: 0,
      onboardingInProgress: 0,
      unacknowledgedOffers: 0,
      stageBreakdown: {},
    },
  };
}

export function emptyInsights() {
  return {
    pendingApprovals: { total: 0, items: [] },
    upcomingBirthdays: [],
    attendanceTrend: [],
    recentActivity: [],
    lifecycleAlerts: { counts: {}, probationEnding: [], contractEnding: [], exitsInProgress: [] },
    lifecyclePipeline: null,
  };
}

function daysUntilNextOccurrence(month, day, fromDate = new Date()) {
  const year = fromDate.getFullYear();
  let next = new Date(year, month - 1, day);
  next.setHours(0, 0, 0, 0);
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);
  if (next < from) {
    next = new Date(year + 1, month - 1, day);
  }
  return Math.ceil((next - from) / (1000 * 60 * 60 * 24));
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function relativeTime(date) {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatShortDate(date);
}

async function getPendingApprovals(businessId, limit = 6) {
  const [leaves, regularizations, payrollQueries, docApprovals] = await Promise.all([
    LeaveRequest.findAll({
      where: { businessId, status: 'PENDING' },
      include: [
        { model: Employee, as: 'employee', attributes: ['empName', 'empId'] },
        { model: LeaveType, as: 'leaveType', attributes: ['name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit,
    }),
    AttendanceRegularization.findAll({
      where: { businessId, status: 'PENDING' },
      include: [{ model: Employee, as: 'employee', attributes: ['empName', 'empId'] }],
      order: [['createdAt', 'DESC']],
      limit,
    }),
    PayrollQuery.findAll({
      where: { businessId, status: 'Pending' },
      include: [{ model: Employee, as: 'employee', attributes: ['empName', 'empId'] }],
      order: [['createdAt', 'DESC']],
      limit,
    }),
    DocumentApprovalRequest.findAll({
      where: { businessId, status: 'pending' },
      include: [{ model: Employee, as: 'employee', attributes: ['empName', 'empId'] }],
      order: [['createdAt', 'DESC']],
      limit,
    }).catch(() => []),
  ]);

  const items = [
    ...leaves.map((lr) => ({
      id: `leave-${lr.id}`,
      kind: 'leave',
      title: lr.employee?.empName || 'Employee',
      subtitle: `${lr.leaveType?.name || 'Leave'} · ${lr.startDate} – ${lr.endDate}`,
      timestamp: lr.createdAt,
      href: '/leave-requests?status=PENDING',
      icon: 'fa-calendar-days',
    })),
    ...regularizations.map((r) => ({
      id: `reg-${r.id}`,
      kind: 'regularization',
      title: r.employee?.empName || 'Employee',
      subtitle: `Attendance regularization · ${r.date}`,
      timestamp: r.createdAt,
      href: '/admin/attendance/regularizations',
      icon: 'fa-pen-ruler',
    })),
    ...payrollQueries.map((q) => ({
      id: `payroll-${q.id}`,
      kind: 'payroll',
      title: q.employee?.empName || 'Employee',
      subtitle: `Payroll query · ${q.category}`,
      timestamp: q.createdAt,
      href: '/admin/payroll/queries',
      icon: 'fa-money-bill-wave',
    })),
    ...docApprovals.map((d) => ({
      id: `doc-${d.id}`,
      kind: 'document',
      title: d.employee?.empName || 'Employee',
      subtitle: `Offer approval · ${d.code}`,
      timestamp: d.createdAt,
      href: '/document-approvals',
      icon: 'fa-file-signature',
    })),
  ];

  items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const [leaveCount, regCount, queryCount, docApprovalCount] = await Promise.all([
    LeaveRequest.count({ where: { businessId, status: 'PENDING' } }),
    AttendanceRegularization.count({ where: { businessId, status: 'PENDING' } }),
    PayrollQuery.count({ where: { businessId, status: 'Pending' } }).catch(() => 0),
    DocumentApprovalRequest.count({ where: { businessId, status: 'pending' } }).catch(() => 0),
  ]);

  return {
    total: leaveCount + regCount + queryCount + docApprovalCount,
    counts: { leaves: leaveCount, regularizations: regCount, payrollQueries: queryCount, documentApprovals: docApprovalCount },
    items: items.slice(0, limit).map((item) => ({
      ...item,
      timestamp: item.timestamp?.toISOString?.() || item.timestamp,
      timeAgo: relativeTime(item.timestamp),
    })),
  };
}

async function getUpcomingCelebrations(businessId, withinDays = 7) {
  const employees = await Employee.findAll({
    where: {
      businessId,
      employmentStatus: { [Op.in]: ACTIVE_STATUSES },
    },
    attributes: ['id', 'empName', 'empDob', 'empDateOfJoining', 'empDepartment'],
  });

  const now = new Date();
  const items = [];

  for (const emp of employees) {
    if (emp.empDob) {
      const dob = new Date(emp.empDob);
      const days = daysUntilNextOccurrence(dob.getMonth() + 1, dob.getDate(), now);
      if (days <= withinDays) {
        const next = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
        if (next < now) next.setFullYear(next.getFullYear() + 1);
        items.push({
          id: `bday-${emp.id}`,
          name: emp.empName,
          type: 'birthday',
          department: emp.empDepartment,
          daysUntil: days,
          date: next.toISOString().split('T')[0],
          label: days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`,
        });
      }
    }

    if (emp.empDateOfJoining) {
      const join = new Date(emp.empDateOfJoining);
      const days = daysUntilNextOccurrence(join.getMonth() + 1, join.getDate(), now);
      if (days <= withinDays) {
        const next = new Date(now.getFullYear(), join.getMonth(), join.getDate());
        if (next < now) next.setFullYear(next.getFullYear() + 1);
        const yearsOfService = next.getFullYear() - join.getFullYear();
        items.push({
          id: `anniv-${emp.id}`,
          name: emp.empName,
          type: 'anniversary',
          department: emp.empDepartment,
          daysUntil: days,
          yearsOfService,
          date: next.toISOString().split('T')[0],
          label: days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`,
        });
      }
    }
  }

  return items.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 8);
}

async function getAttendanceTrend(businessId, days = 7) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  const rows = await AttendanceDailySummary.findAll({
    where: { businessId, date: { [Op.between]: [startStr, endStr] } },
    attributes: ['date', 'status'],
    raw: true,
  });

  const trend = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    trend.push({
      date: key,
      label: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      present: 0,
      absent: 0,
      late: 0,
      onLeave: 0,
    });
  }

  const byDate = Object.fromEntries(trend.map((t) => [t.date, t]));
  rows.forEach((r) => {
    const bucket = byDate[r.date];
    if (!bucket) return;
    if (r.status === 'PRESENT' || r.status === 'HALF_DAY') bucket.present += 1;
    else if (r.status === 'ABSENT') bucket.absent += 1;
    else if (r.status === 'LATE') bucket.late += 1;
    else if (r.status === 'LEAVE') bucket.onLeave += 1;
  });

  return trend;
}

async function getRecentActivity(businessId, userId, limit = 8) {
  const activities = [];

  const [leaves, regularizations, newEmployees, notifications] = await Promise.all([
    LeaveRequest.findAll({
      where: { businessId },
      include: [
        { model: Employee, as: 'employee', attributes: ['empName'] },
        { model: LeaveType, as: 'leaveType', attributes: ['name'] },
      ],
      order: [['updatedAt', 'DESC']],
      limit: 5,
    }),
    AttendanceRegularization.findAll({
      where: { businessId },
      include: [{ model: Employee, as: 'employee', attributes: ['empName'] }],
      order: [['updatedAt', 'DESC']],
      limit: 4,
    }),
    Employee.findAll({
      where: { businessId },
      attributes: ['id', 'empName', 'empDepartment', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 3,
    }),
    userId
      ? Notification.findAll({
          where: { userId, businessId, isDismissed: false },
          order: [['createdAt', 'DESC']],
          limit: 5,
        })
      : [],
  ]);

  leaves.forEach((lr) => {
    const statusLabel = lr.status.charAt(0) + lr.status.slice(1).toLowerCase();
    activities.push({
      id: `leave-act-${lr.id}`,
      type: 'leave',
      title: `${lr.employee?.empName || 'Employee'} — ${statusLabel}`,
      subtitle: `${lr.leaveType?.name || 'Leave'} · ${lr.startDate}`,
      timestamp: lr.updatedAt,
      href: '/leave-requests',
      icon: 'fa-calendar-check',
    });
  });

  regularizations.forEach((r) => {
    activities.push({
      id: `reg-act-${r.id}`,
      type: 'regularization',
      title: `${r.employee?.empName || 'Employee'} — ${r.status}`,
      subtitle: `Regularization · ${r.date}`,
      timestamp: r.updatedAt,
      href: '/admin/attendance/regularizations',
      icon: 'fa-clock',
    });
  });

  newEmployees.forEach((e) => {
    activities.push({
      id: `emp-act-${e.id}`,
      type: 'employee',
      title: `New employee: ${e.empName}`,
      subtitle: e.empDepartment || 'Onboarded',
      timestamp: e.createdAt,
      href: '/employees',
      icon: 'fa-user-plus',
    });
  });

  notifications.forEach((n) => {
    activities.push({
      id: `notif-${n.id}`,
      type: 'notification',
      title: n.title,
      subtitle: n.message?.slice(0, 80) || n.type.replace(/_/g, ' '),
      timestamp: n.createdAt,
      href: n.link || '#',
      icon: 'fa-bell',
    });
  });

  return activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit)
    .map((item) => ({
      ...item,
      timestamp: item.timestamp?.toISOString?.() || item.timestamp,
      timeAgo: relativeTime(item.timestamp),
    }));
}

export async function getInsightsData(businessId, userId) {
  if (!businessId) return emptyInsights();

  const [pendingApprovals, upcomingBirthdays, attendanceTrend, recentActivity, lifecycleAlerts, lifecyclePipeline] =
    await Promise.all([
      getPendingApprovals(businessId),
      getUpcomingCelebrations(businessId),
      getAttendanceTrend(businessId),
      getRecentActivity(businessId, userId),
      getLifecycleAlertsSummary(businessId),
      getLifecycleWidgetStats(businessId),
    ]);

  return { pendingApprovals, upcomingBirthdays, attendanceTrend, recentActivity, lifecycleAlerts, lifecyclePipeline };
}

async function getEmployeeStats(businessId) {
  const total = await Employee.count({ where: { businessId } });
  const active = await Employee.count({
    where: { businessId, employmentStatus: { [Op.in]: ACTIVE_STATUSES } },
  });
  return { total, active, inactive: Math.max(0, total - active) };
}

async function getLeaveWidgetStats(businessId) {
  const statusCounts = await LeaveRequest.findAll({
    where: { businessId },
    attributes: [
      'status',
      [LeaveRequest.sequelize.fn('COUNT', LeaveRequest.sequelize.col('id')), 'count'],
    ],
    group: ['status'],
    raw: true,
  });

  const stats = { pending: 0, approved: 0, rejected: 0, canceled: 0 };
  statusCounts.forEach((s) => {
    const key = String(s.status || '').toLowerCase();
    if (key in stats) stats[key] = parseInt(s.count, 10) || 0;
  });
  return stats;
}

async function getLifecycleStageBreakdown(businessId) {
  const rows = await Employee.findAll({
    where: { businessId },
    attributes: [
      'lifecycleStage',
      [Employee.sequelize.fn('COUNT', Employee.sequelize.col('id')), 'count'],
    ],
    group: ['lifecycleStage'],
    raw: true,
  });

  const breakdown = {
    prospect: 0,
    offer: 0,
    joining: 0,
    active: 0,
    confirmed: 0,
    offboarding: 0,
    exited: 0,
  };

  rows.forEach((row) => {
    const key = row.lifecycleStage || 'prospect';
    if (key in breakdown) breakdown[key] = parseInt(row.count, 10) || 0;
  });

  return breakdown;
}

async function getUnacknowledgedOfferCount(businessId) {
  const employees = await Employee.findAll({
    where: { businessId, lifecycleStage: { [Op.in]: ['offer', 'joining'] } },
    attributes: ['id'],
    raw: true,
  });
  const ids = employees.map((e) => e.id);
  if (!ids.length) return 0;

  return EmployeeGeneratedDocument.count({
    where: {
      employeeId: { [Op.in]: ids },
      code: { [Op.in]: ['OFFER_LETTER', 'INTERNSHIP_OFFER', 'PRE_PLACEMENT_OFFER'] },
      acknowledgedAt: null,
    },
  }).catch(() => 0);
}

async function getLifecycleWidgetStats(businessId) {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const [offersPending, exitsInProgress, candidatesProspect, probationEmployees, contractEndingSoon, stageBreakdown, unacknowledgedOffers] =
    await Promise.all([
      DocumentApprovalRequest.count({ where: { businessId, status: 'pending' } }).catch(() => 0),
      Employee.count({ where: { businessId, lifecycleStage: 'offboarding' } }),
      Candidate.count({
        where: { businessId, status: { [Op.in]: ['prospect', 'offer_pending'] } },
      }).catch(() => 0),
      Employee.findAll({
        where: {
          businessId,
          lifecycleStage: { [Op.in]: ['joining', 'active'] },
          employmentStatus: { [Op.in]: ACTIVE_STATUSES },
          probationPeriodMonths: { [Op.gt]: 0 },
        },
        attributes: ['id', 'empDateOfJoining', 'probationPeriodMonths'],
        raw: true,
      }),
      getLifecycleAlertsSummary(businessId).then((s) => s.counts.contractEnding).catch(() => 0),
      getLifecycleStageBreakdown(businessId),
      getUnacknowledgedOfferCount(businessId),
    ]);

  const now = new Date();
  let probationEndingSoon = 0;
  probationEmployees.forEach((emp) => {
    if (!emp.empDateOfJoining) return;
    const start = new Date(emp.empDateOfJoining);
    if (isNaN(start.getTime())) return;
    const months = Number(emp.probationPeriodMonths) || 3;
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    if (end >= now && end <= thirtyDaysFromNow) probationEndingSoon += 1;
  });

  const onboardingInProgress =
    (stageBreakdown.prospect || 0) +
    (stageBreakdown.offer || 0) +
    (stageBreakdown.joining || 0);

  return {
    offersPending,
    exitsInProgress,
    probationEndingSoon,
    contractEndingSoon,
    candidatesProspect,
    onboardingInProgress,
    unacknowledgedOffers,
    stageBreakdown,
  };
}

export async function getWidgetData(businessId) {
  if (!businessId) return emptyWidgets();

  const today = new Date().toISOString().split('T')[0];

  const [employeeStats, leaveStats, attendanceData, latestPayrollRun, pendingPayrollQueries, lifecycleStats] =
    await Promise.all([
      getEmployeeStats(businessId),
      getLeaveWidgetStats(businessId),
      getAttendanceDashboard({ businessId, date: today }).catch(() => null),
      PayrollRun.findOne({
        where: { businessId },
        order: [
          ['periodYear', 'DESC'],
          ['periodMonth', 'DESC'],
        ],
        attributes: ['id', 'status', 'periodMonth', 'periodYear', 'employeeCount', 'totalNetPay'],
      }),
      PayrollQuery.count({ where: { businessId, status: 'Pending' } }).catch(() => 0),
      getLifecycleWidgetStats(businessId),
    ]);

  const counts = attendanceData?.counts || {};

  return {
    employees: employeeStats,
    payroll: {
      latestRun: latestPayrollRun
        ? {
            id: latestPayrollRun.id,
            status: latestPayrollRun.status,
            period: `${latestPayrollRun.periodYear}-${String(latestPayrollRun.periodMonth).padStart(2, '0')}`,
            employeeCount: latestPayrollRun.employeeCount || 0,
            totalNetPay: Number(latestPayrollRun.totalNetPay || 0),
          }
        : null,
      pendingQueries: pendingPayrollQueries,
    },
    leaves: leaveStats,
    attendance: {
      date: attendanceData?.date || today,
      present: counts.PRESENT || 0,
      absent: counts.ABSENT || 0,
      late: counts.LATE || 0,
      onLeave: counts.LEAVE || 0,
      total: counts.total || 0,
      pendingRegularizations: attendanceData?.pendingRegularizations || 0,
    },
    tasks: { pending: 0, completed: 0, total: 0 },
    lifecycle: lifecycleStats,
  };
}
