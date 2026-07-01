import { Op } from 'sequelize';
import {
  Employee,
  LeaveRequest,
  LeaveType,
  PayrollRun,
  AttendanceDailySummary,
  AttendanceRegularization,
  AttendanceLock,
  EmployeeDocument,
  EmployeeSalaryStructure,
  EmployeeBankDetail,
  PayrollSetting,
  StatutoryCompliance,
  AuditLog,
  User,
} from '../../models/index.js';
import { getSetupStatus } from '../setup/setupStatusService.js';
import { getInsightsData } from '../dashboard.service.js';
import { missingDataProfileTab, profileTabHref } from '../employeeProfileAudit.service.js';

const ACTIVE_STATUSES = ['Active', 'ACTIVE', 'active'];
const EXPIRY_WARNING_DAYS = 30;
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function card({
  id,
  title,
  metric,
  status = 'good',
  summary = '',
  blockers = [],
  action = { label: 'View Details', href: '/dashboard' },
  items = [],
}) {
  return {
    id,
    title,
    metric,
    status,
    summary,
    blockers: blockers.slice(0, 5),
    action,
    items: items.slice(0, 3),
  };
}

function statusFromCount(count, warningAt = 1, criticalAt = 5) {
  if (!count) return 'good';
  if (count >= criticalAt) return 'critical';
  if (count >= warningAt) return 'warning';
  return 'warning';
}

function statusFromPercent(percent) {
  if (percent >= 90) return 'good';
  if (percent >= 60) return 'warning';
  return 'critical';
}

function currentPeriod() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    monthLabel: MONTH_NAMES[now.getMonth()],
  };
}

function daysUntilPayday(payDay = 25) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let target = new Date(year, month, Math.min(payDay, 28));
  if (now > target) {
    target = new Date(year, month + 1, Math.min(payDay, 28));
  }
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function datesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

async function getActiveEmployeeIds(businessId) {
  const rows = await Employee.findAll({
    where: {
      businessId,
      [Op.or]: [
        { employmentStatus: { [Op.in]: ACTIVE_STATUSES } },
        { isActive: true },
      ],
    },
    attributes: ['id'],
    raw: true,
  });
  return rows.map((r) => r.id);
}

export function emptyCommandCenter() {
  const sections = [
    'setupCompletion',
    'payrollReadiness',
    'pendingApprovals',
    'employeesMissingData',
    'attendanceExceptions',
    'upcomingPayroll',
    'complianceDueDates',
    'documentExpiryAlerts',
    'leaveConflicts',
    'recentAdminChanges',
  ].map((id) =>
    card({
      id,
      title: id.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
      metric: { value: 0, label: 'No data' },
      status: 'good',
      summary: 'No organization linked',
      blockers: [],
      action: { label: 'View Details', href: '/dashboard' },
    })
  );
  return { generatedAt: new Date().toISOString(), sections };
}

async function buildSetupCompletion(businessId) {
  try {
    const setup = await getSetupStatus(businessId);
    const score = Math.round(setup.score || 0);
    const blockers = (setup.missingItems || []).map((m) => m.message);
    const critical = setup.criticalMissing?.length || 0;

    return card({
      id: 'setupCompletion',
      title: 'Setup Completion',
      metric: { value: `${score}%`, label: 'Complete' },
      status: critical > 0 ? 'critical' : statusFromPercent(score),
      summary: score >= 100
        ? 'Company setup is complete'
        : `${blockers.length} setup item${blockers.length === 1 ? '' : 's'} still need attention`,
      blockers: blockers.length ? blockers : (score >= 100 ? ['All setup steps completed'] : []),
      action: { label: score >= 100 ? 'View Details' : 'Fix Now', href: '/admin/setup' },
    });
  } catch (err) {
    return card({
      id: 'setupCompletion',
      title: 'Setup Completion',
      metric: { value: '—', label: 'Unavailable' },
      status: 'warning',
      summary: 'Unable to load setup status',
      blockers: [err?.message || 'Please try again'],
      action: { label: 'View Details', href: '/admin/setup' },
    });
  }
}

async function buildPayrollReadiness(businessId) {
  try {
    const period = currentPeriod();
    const employeeIds = await getActiveEmployeeIds(businessId);
    const total = employeeIds.length;

    const [missingStructure, missingBank, pendingLeaves, attendanceLocked, payrollSetting] = await Promise.all([
      total
        ? EmployeeSalaryStructure.count({
            where: { employeeId: { [Op.in]: employeeIds }, isActive: true },
            distinct: true,
            col: 'employeeId',
          }).then((withStruct) => total - withStruct)
        : 0,
      total
        ? EmployeeBankDetail.count({
            where: {
              employeeId: { [Op.in]: employeeIds },
              accountNumber: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
            },
          }).then((withBank) => total - withBank)
        : 0,
      LeaveRequest.count({ where: { businessId, status: 'PENDING' } }),
      AttendanceLock.findOne({ where: { businessId, period: period.period } }),
      PayrollSetting.findOne({ where: { businessId } }),
    ]);

    const statutory = payrollSetting?.statutoryConfig || {};
    const hasStatutory = Boolean(
      statutory.PF || statutory.pf?.enabled || statutory.pf
      || statutory.ESI || statutory.esi?.enabled || statutory.esi
    );
    const pfIncomplete = !!payrollSetting && !hasStatutory;

    const checks = [
      { pass: total === 0 || missingStructure === 0, msg: `${missingStructure} employee${missingStructure === 1 ? '' : 's'} missing salary structure` },
      { pass: total === 0 || missingBank === 0, msg: `${missingBank} employee${missingBank === 1 ? '' : 's'} missing bank details` },
      { pass: !!attendanceLocked, msg: `${period.monthLabel} attendance is not locked` },
      { pass: pendingLeaves === 0, msg: `${pendingLeaves} leave request${pendingLeaves === 1 ? '' : 's'} pending approval` },
      { pass: !pfIncomplete, msg: 'PF setup is incomplete' },
      { pass: !!payrollSetting, msg: 'Payroll settings not configured' },
    ];

    const passed = checks.filter((c) => c.pass).length;
    const percent = checks.length ? Math.round((passed / checks.length) * 100) : 100;
    const blockers = checks.filter((c) => !c.pass).map((c) => c.msg);

    let fixHref = '/admin/payroll/setup';
    if (missingStructure > 0 || missingBank > 0) {
      const rows = await Employee.findAll({
        where: { businessId, id: { [Op.in]: employeeIds } },
        attributes: ['id'],
        include: [
          { model: EmployeeBankDetail, as: 'bankDetails', required: false },
          { model: EmployeeSalaryStructure, as: 'salaryStructures', required: false, attributes: ['id', 'isActive'] },
        ],
        limit: 100,
      });
      const target = rows.find((emp) => {
        const noStruct = !emp.salaryStructures?.some((s) => s.isActive);
        const noBank = !emp.bankDetails?.accountNumber;
        return noStruct || noBank;
      });
      if (target) {
        const missing = [];
        if (!target.salaryStructures?.some((s) => s.isActive)) missing.push('salary structure');
        if (!target.bankDetails?.accountNumber) missing.push('bank details');
        fixHref = profileTabHref(target.id, missingDataProfileTab(missing));
      }
    } else if (pendingLeaves > 0) {
      fixHref = '/leave-requests?status=PENDING';
    } else if (!attendanceLocked) {
      fixHref = '/admin/attendance/lock';
    }

    return card({
      id: 'payrollReadiness',
      title: 'Payroll Readiness',
      metric: { value: `${percent}%`, label: 'Ready' },
      status: statusFromPercent(percent),
      summary: percent >= 100
        ? 'Payroll can be processed for the current period'
        : 'Payroll cannot be processed because:',
      blockers: blockers.length ? blockers : ['All payroll prerequisites are met'],
      action: { label: percent >= 100 ? 'View Details' : 'Fix Now', href: fixHref },
    });
  } catch (err) {
    return card({
      id: 'payrollReadiness',
      title: 'Payroll Readiness',
      metric: { value: '—', label: 'Unavailable' },
      status: 'warning',
      summary: 'Unable to assess payroll readiness',
      blockers: [err?.message || 'Please try again'],
      action: { label: 'Fix Now', href: '/admin/payroll/setup' },
    });
  }
}

async function buildPendingApprovals(businessId) {
  try {
    const insights = await getInsightsData(businessId);
    const approvals = insights.pendingApprovals || { total: 0, counts: {}, items: [] };
    const total = approvals.total || 0;
    const counts = approvals.counts || {};
    const blockers = [];
    if (counts.leaves) blockers.push(`${counts.leaves} leave request${counts.leaves === 1 ? '' : 's'} awaiting approval`);
    if (counts.regularizations) blockers.push(`${counts.regularizations} attendance regularization${counts.regularizations === 1 ? '' : 's'} pending`);
    if (counts.payrollQueries) blockers.push(`${counts.payrollQueries} payroll quer${counts.payrollQueries === 1 ? 'y' : 'ies'} open`);
    if (counts.documentApprovals) blockers.push(`${counts.documentApprovals} document approval${counts.documentApprovals === 1 ? '' : 's'} pending`);

    return card({
      id: 'pendingApprovals',
      title: 'Pending Approvals',
      metric: { value: total, label: 'Pending' },
      status: statusFromCount(total),
      summary: total ? 'Items waiting for your review' : 'No pending approvals — you\'re all caught up',
      blockers: blockers.length ? blockers : ['No approvals in queue'],
      action: { label: total ? 'View Details' : 'View Details', href: '/leave-requests?status=PENDING' },
      items: (approvals.items || []).map((i) => ({
        id: i.id,
        title: i.title,
        subtitle: i.subtitle,
        href: i.href,
      })),
    });
  } catch (err) {
    return card({
      id: 'pendingApprovals',
      title: 'Pending Approvals',
      metric: { value: '—', label: 'Unavailable' },
      status: 'warning',
      summary: 'Unable to load approvals',
      blockers: [err?.message || 'Please try again'],
      action: { label: 'View Details', href: '/leave-requests?status=PENDING' },
    });
  }
}

async function buildEmployeesMissingData(businessId) {
  try {
    const employees = await Employee.findAll({
      where: {
        businessId,
        [Op.or]: [
          { employmentStatus: { [Op.in]: ACTIVE_STATUSES } },
          { isActive: true },
        ],
      },
      attributes: ['id', 'empName', 'empId', 'empDesignation', 'empDepartment'],
      include: [
        { model: EmployeeBankDetail, as: 'bankDetails', required: false },
        { model: EmployeeSalaryStructure, as: 'salaryStructures', required: false, attributes: ['id', 'isActive'] },
      ],
    });

    const incomplete = [];
    for (const emp of employees) {
      const missing = [];
      if (!emp.empDesignation) missing.push('designation');
      if (!emp.bankDetails?.accountNumber) missing.push('bank details');
      if (!emp.bankDetails?.panNumber) missing.push('PAN');
      if (!emp.salaryStructures?.some((s) => s.isActive)) missing.push('salary structure');
      if (missing.length) {
        incomplete.push({
          id: emp.id,
          title: emp.empName || emp.empId,
          subtitle: `Missing: ${missing.join(', ')}`,
          href: profileTabHref(emp.id, missingDataProfileTab(missing)),
          missing,
        });
      }
    }

    const count = incomplete.length;
    const blockers = incomplete.slice(0, 5).map((e) => `${e.title} — ${e.subtitle.replace('Missing: ', '')}`);

    return card({
      id: 'employeesMissingData',
      title: 'Employees Missing Data',
      metric: { value: count, label: 'Employees' },
      status: statusFromCount(count),
      summary: count
        ? 'Active employees with incomplete profiles'
        : 'All active employee profiles are complete',
      blockers: blockers.length ? blockers : ['No missing employee data'],
      action: {
        label: count ? 'Fix Now' : 'View Details',
        href: count ? incomplete[0].href : '/employees',
      },
      items: incomplete,
    });
  } catch (err) {
    return card({
      id: 'employeesMissingData',
      title: 'Employees Missing Data',
      metric: { value: '—', label: 'Unavailable' },
      status: 'warning',
      summary: 'Unable to scan employee records',
      blockers: [err?.message || 'Please try again'],
      action: { label: 'View Details', href: '/employees' },
    });
  }
}

async function buildAttendanceExceptions(businessId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [absentToday, lateToday, pendingRegs, regItems] = await Promise.all([
      AttendanceDailySummary.count({ where: { businessId, date: today, status: 'ABSENT' } }),
      AttendanceDailySummary.count({ where: { businessId, date: today, status: 'LATE' } }),
      AttendanceRegularization.count({ where: { businessId, status: 'PENDING' } }),
      AttendanceRegularization.findAll({
        where: { businessId, status: 'PENDING' },
        include: [{ model: Employee, as: 'employee', attributes: ['empName'] }],
        order: [['createdAt', 'DESC']],
        limit: 3,
      }),
    ]);

    const total = absentToday + lateToday + pendingRegs;
    const blockers = [];
    if (absentToday) blockers.push(`${absentToday} employee${absentToday === 1 ? '' : 's'} absent today`);
    if (lateToday) blockers.push(`${lateToday} late arrival${lateToday === 1 ? '' : 's'} today`);
    if (pendingRegs) blockers.push(`${pendingRegs} pending regularization${pendingRegs === 1 ? '' : 's'}`);

    return card({
      id: 'attendanceExceptions',
      title: 'Attendance Exceptions',
      metric: { value: total, label: 'Exceptions' },
      status: statusFromCount(total),
      summary: total ? 'Attendance issues need review today' : 'No attendance exceptions today',
      blockers: blockers.length ? blockers : ['Attendance is on track'],
      action: { label: total ? 'Fix Now' : 'View Details', href: '/admin/attendance/regularizations' },
      items: regItems.map((r) => ({
        id: r.id,
        title: r.employee?.empName || 'Employee',
        subtitle: `Regularization · ${r.date}`,
        href: r.employeeId ? profileTabHref(r.employeeId, 'attendance') : '/admin/attendance/regularizations',
      })),
    });
  } catch (err) {
    return card({
      id: 'attendanceExceptions',
      title: 'Attendance Exceptions',
      metric: { value: '—', label: 'Unavailable' },
      status: 'warning',
      summary: 'Unable to load attendance exceptions',
      blockers: [err?.message || 'Please try again'],
      action: { label: 'View Details', href: '/admin/attendance' },
    });
  }
}

async function buildUpcomingPayroll(businessId) {
  try {
    const period = currentPeriod();
    const [payrollSetting, latestRun] = await Promise.all([
      PayrollSetting.findOne({ where: { businessId } }),
      PayrollRun.findOne({
        where: { businessId, periodMonth: period.month, periodYear: period.year },
        order: [['createdAt', 'DESC']],
      }),
    ]);

    const payDay = payrollSetting?.payDay || 25;
    const days = daysUntilPayday(payDay);
    const runStatus = latestRun?.status || 'Not started';
    const blockers = [];
    if (!latestRun) blockers.push(`No payroll run created for ${period.monthLabel} ${period.year}`);
    else if (!['Locked', 'Paid', 'Approved', 'Processing'].includes(latestRun.status)) {
      blockers.push(`Current run status: ${latestRun.status}`);
    }
    if (!payrollSetting) blockers.push('Payroll settings not configured');

    const status = !latestRun ? 'warning' : (['Paid', 'Approved'].includes(latestRun.status) ? 'good' : 'warning');

    return card({
      id: 'upcomingPayroll',
      title: 'Upcoming Payroll',
      metric: { value: days, label: `Day${days === 1 ? '' : 's'} to payday` },
      status,
      summary: `Next payday on ${payDay}${getOrdinal(payDay)} · ${period.monthLabel} run: ${runStatus}`,
      blockers: blockers.length ? blockers : [`Payroll on track for ${period.monthLabel}`],
      action: { label: 'View Details', href: '/admin/payroll/runs' },
    });
  } catch (err) {
    return card({
      id: 'upcomingPayroll',
      title: 'Upcoming Payroll',
      metric: { value: '—', label: 'Unavailable' },
      status: 'warning',
      summary: 'Unable to load payroll schedule',
      blockers: [err?.message || 'Please try again'],
      action: { label: 'View Details', href: '/admin/payroll/runs' },
    });
  }
}

function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

async function buildComplianceDueDates(businessId) {
  try {
    const latestRun = await PayrollRun.findOne({
      where: { businessId, status: { [Op.in]: ['Locked', 'Approved', 'Paid', 'Processing'] } },
      order: [['periodYear', 'DESC'], ['periodMonth', 'DESC']],
    });

    if (!latestRun) {
      return card({
        id: 'complianceDueDates',
        title: 'Compliance Due Dates',
        metric: { value: 0, label: 'Open items' },
        status: 'good',
        summary: 'No locked payroll run — statutory filings not due yet',
        blockers: ['Process and lock a payroll run to track compliance'],
        action: { label: 'View Details', href: '/admin/payroll/statutory' },
      });
    }

    const compliance = await StatutoryCompliance.findOne({
      where: { businessId, payrollRunId: latestRun.id },
    });

    const periodLabel = `${MONTH_NAMES[latestRun.periodMonth - 1]} ${latestRun.periodYear}`;
    const blockers = [];
    if (!compliance?.pfFiled) blockers.push(`PF filing pending for ${periodLabel}`);
    if (!compliance?.esiFiled) blockers.push(`ESI filing pending for ${periodLabel}`);
    if (!compliance?.ptFiled) blockers.push(`PT filing pending for ${periodLabel}`);
    if (!compliance?.tdsDeposited) blockers.push(`TDS deposit pending for ${periodLabel}`);

    const open = blockers.length;
    return card({
      id: 'complianceDueDates',
      title: 'Compliance Due Dates',
      metric: { value: open, label: 'Open filings' },
      status: statusFromCount(open),
      summary: open ? `Statutory compliance items open for ${periodLabel}` : `All statutory filings complete for ${periodLabel}`,
      blockers: blockers.length ? blockers : ['PF, ESI, PT, and TDS are filed'],
      action: { label: open ? 'Fix Now' : 'View Details', href: '/admin/payroll/statutory' },
    });
  } catch (err) {
    return card({
      id: 'complianceDueDates',
      title: 'Compliance Due Dates',
      metric: { value: '—', label: 'Unavailable' },
      status: 'warning',
      summary: 'Unable to load compliance status',
      blockers: [err?.message || 'Please try again'],
      action: { label: 'View Details', href: '/admin/payroll/statutory' },
    });
  }
}

async function buildDocumentExpiryAlerts(businessId) {
  try {
    const now = new Date();
    const warnDate = new Date(now);
    warnDate.setDate(warnDate.getDate() + EXPIRY_WARNING_DAYS);
    const warnStr = warnDate.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    const docs = await EmployeeDocument.findAll({
      where: {
        expiryDate: { [Op.and]: [{ [Op.ne]: null }, { [Op.lte]: warnStr }] },
      },
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['id', 'empName', 'businessId'],
        where: { businessId },
        required: true,
      }],
      order: [['expiryDate', 'ASC']],
      limit: 20,
    });

    const expired = docs.filter((d) => d.expiryDate <= todayStr);
    const expiring = docs.filter((d) => d.expiryDate > todayStr);
    const count = docs.length;
    const blockers = docs.slice(0, 5).map((d) => {
      const days = Math.ceil((new Date(d.expiryDate) - now) / (1000 * 60 * 60 * 24));
      const label = days < 0 ? 'expired' : `expires in ${days}d`;
      return `${d.employee?.empName || 'Employee'} — ${d.documentType} (${label})`;
    });

    return card({
      id: 'documentExpiryAlerts',
      title: 'Document Expiry Alerts',
      metric: { value: count, label: 'Documents' },
      status: expired.length ? 'critical' : statusFromCount(count),
      summary: count
        ? `${expired.length} expired · ${expiring.length} expiring within ${EXPIRY_WARNING_DAYS} days`
        : 'No documents expiring soon',
      blockers: blockers.length ? blockers : ['All employee documents are current'],
      action: { label: count ? 'Fix Now' : 'View Details', href: '/documents' },
      items: docs.slice(0, 3).map((d) => ({
        id: d.id,
        title: d.employee?.empName || 'Employee',
        subtitle: `${d.documentType} · ${d.expiryDate}`,
        href: '/documents',
      })),
    });
  } catch (err) {
    return card({
      id: 'documentExpiryAlerts',
      title: 'Document Expiry Alerts',
      metric: { value: '—', label: 'Unavailable' },
      status: 'warning',
      summary: 'Unable to load document expiry data',
      blockers: [err?.message || 'Please try again'],
      action: { label: 'View Details', href: '/documents' },
    });
  }
}

async function buildLeaveConflicts(businessId) {
  try {
    const leaves = await LeaveRequest.findAll({
      where: { businessId, status: { [Op.in]: ['PENDING', 'APPROVED'] } },
      include: [
        { model: Employee, as: 'employee', attributes: ['empName'] },
        { model: LeaveType, as: 'leaveType', attributes: ['name'] },
      ],
      order: [['employeeId', 'ASC'], ['startDate', 'ASC']],
    });

    const conflicts = [];
    const byEmployee = {};
    for (const lr of leaves) {
      if (!byEmployee[lr.employeeId]) byEmployee[lr.employeeId] = [];
      const existing = byEmployee[lr.employeeId];
      for (const other of existing) {
        if (datesOverlap(lr.startDate, lr.endDate, other.startDate, other.endDate)) {
          conflicts.push({
            id: `conflict-${lr.id}-${other.id}`,
            title: lr.employee?.empName || 'Employee',
            subtitle: `Overlapping ${lr.leaveType?.name || 'leave'}: ${lr.startDate} – ${lr.endDate}`,
            href: '/leave-requests',
          });
          break;
        }
      }
      existing.push(lr);
    }

    const count = conflicts.length;
    const blockers = conflicts.slice(0, 5).map((c) => `${c.title} — ${c.subtitle}`);

    return card({
      id: 'leaveConflicts',
      title: 'Leave Conflicts',
      metric: { value: count, label: 'Conflicts' },
      status: statusFromCount(count),
      summary: count ? 'Overlapping leave requests detected' : 'No leave conflicts detected',
      blockers: blockers.length ? blockers : ['Leave schedules are conflict-free'],
      action: { label: count ? 'Fix Now' : 'View Details', href: '/leave-requests' },
      items: conflicts,
    });
  } catch (err) {
    return card({
      id: 'leaveConflicts',
      title: 'Leave Conflicts',
      metric: { value: '—', label: 'Unavailable' },
      status: 'warning',
      summary: 'Unable to check leave conflicts',
      blockers: [err?.message || 'Please try again'],
      action: { label: 'View Details', href: '/leave-requests' },
    });
  }
}

async function buildRecentAdminChanges(businessId) {
  try {
    const logs = await AuditLog.findAll({
      where: { businessId },
      order: [['createdAt', 'DESC']],
      limit: 8,
    });

    const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))];
    const users = userIds.length
      ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'firstName', 'lastName'] })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Admin']));

    const items = logs.map((log) => {
      const employeeId = log.newValue?.employeeId || log.oldValue?.employeeId;
      const href = log.module === 'employee_profile' && employeeId
        ? profileTabHref(employeeId, 'timeline')
        : (log.module === 'employee_profile' ? '/employees' : '/admin/setup');
      return {
        id: log.id,
        title: log.action.replace(/_/g, ' '),
        subtitle: `${userMap[log.userId] || 'System'} · ${log.module}`,
        href,
      };
    });

    const count = logs.length;
    const blockers = items.slice(0, 5).map((i) => `${i.title} — ${i.subtitle}`);

    return card({
      id: 'recentAdminChanges',
      title: 'Recent Admin Changes',
      metric: { value: count, label: 'Changes' },
      status: 'good',
      summary: count ? 'Latest configuration changes in your organization' : 'No admin changes recorded yet',
      blockers: blockers.length ? blockers : ['Admin audit trail will appear here'],
      action: { label: 'View Details', href: items[0]?.href || '/employees' },
      items,
    });
  } catch (err) {
    return card({
      id: 'recentAdminChanges',
      title: 'Recent Admin Changes',
      metric: { value: '—', label: 'Unavailable' },
      status: 'warning',
      summary: 'Unable to load admin change history',
      blockers: [err?.message || 'Please try again'],
      action: { label: 'View Details', href: '/admin/setup' },
    });
  }
}

export async function getCommandCenterData(businessId) {
  const sections = await Promise.all([
    buildSetupCompletion(businessId),
    buildPayrollReadiness(businessId),
    buildPendingApprovals(businessId),
    buildEmployeesMissingData(businessId),
    buildAttendanceExceptions(businessId),
    buildUpcomingPayroll(businessId),
    buildComplianceDueDates(businessId),
    buildDocumentExpiryAlerts(businessId),
    buildLeaveConflicts(businessId),
    buildRecentAdminChanges(businessId),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    sections,
  };
}
