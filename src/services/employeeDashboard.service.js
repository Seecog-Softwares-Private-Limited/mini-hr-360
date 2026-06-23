import { Op } from 'sequelize';
import {
  Employee,
  LeaveRequest,
  AttendanceDailySummary,
  AttendanceRegularization,
  PayrollSetting,
} from '../models/index.js';
import { getLeaveStats } from './leave.service.js';
import { getCalendar, getToday } from './attendance.service.js';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function daysUntilPayday(payDay = 25) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let target = new Date(year, month, Math.min(payDay, 28));

  if (now > target) {
    target = new Date(year, month + 1, Math.min(payDay, 28));
  }

  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return { days: diff, payDay };
}

function computeStreak(summaries) {
  const presentDates = new Set(
    summaries
      .filter((s) => s.status === 'PRESENT' || s.status === 'HALF_DAY')
      .map((s) => s.date)
  );

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (true) {
    const day = cursor.getDay();
    if (day === 0 || day === 6) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    const key = cursor.toISOString().split('T')[0];
    if (presentDates.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (streak === 0 && cursor.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]) {
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function computeReputation({ streak, attendanceRate, pendingLeaves, tenureMonths }) {
  let score = 70;
  score += Math.min(streak * 2, 20);
  score += Math.min(Math.round(attendanceRate / 5), 10);
  score -= pendingLeaves * 2;
  score += Math.min(Math.floor(tenureMonths / 6), 5);
  return Math.max(0, Math.min(100, score));
}

function formatClockTime(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatWorkDuration(minutes) {
  const m = Number(minutes) || 0;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}m`;
  return `${h}h ${rem}m`;
}

function formatAttendanceStatus(status) {
  const labels = {
    NOT_MARKED: 'Not marked',
    PRESENT: 'Present',
    LATE: 'Late',
    ABSENT: 'Absent',
    HALF_DAY: 'Half day',
    LEAVE: 'On leave',
    HOLIDAY: 'Holiday',
    WEEKOFF: 'Week off',
  };
  return labels[status] || status || 'Not marked';
}

function attendanceStatusClass(status) {
  const map = {
    NOT_MARKED: 'not-marked',
    PRESENT: 'present',
    LATE: 'late',
    ABSENT: 'absent',
    HALF_DAY: 'half-day',
    LEAVE: 'leave',
    HOLIDAY: 'holiday',
    WEEKOFF: 'weekoff',
  };
  return map[status] || 'not-marked';
}

export async function getTodayAttendanceWidget(employee) {
  const today = new Date().toISOString().split('T')[0];
  try {
    const { summary, punches, assignment } = await getToday({
      businessId: employee.businessId,
      employeeId: employee.id,
      date: today,
    });
    const isWorking = Boolean(summary?.firstInAt && !summary?.lastOutAt);
    return {
      date: today,
      status: summary?.status || 'NOT_MARKED',
      statusLabel: formatAttendanceStatus(summary?.status),
      statusClass: attendanceStatusClass(summary?.status || 'NOT_MARKED'),
      clockIn: formatClockTime(summary?.firstInAt),
      clockOut: formatClockTime(summary?.lastOutAt),
      workMinutes: summary?.workMinutes || 0,
      workDuration: formatWorkDuration(summary?.workMinutes),
      isWorking,
      punchCount: punches?.length || 0,
      shift: assignment?.shift
        ? {
            name: assignment.shift.name,
            startTime: assignment.shift.startTime,
            endTime: assignment.shift.endTime,
          }
        : null,
    };
  } catch {
    return {
      date: today,
      status: 'NOT_MARKED',
      statusLabel: 'Not marked',
      statusClass: 'not-marked',
      clockIn: null,
      clockOut: null,
      workMinutes: 0,
      workDuration: '0m',
      isWorking: false,
      punchCount: 0,
      shift: null,
    };
  }
}

export async function getEmployeeDashboardOverview(employee) {
  const businessId = employee.businessId;
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const today = now.toISOString().split('T')[0];

  const [leaveStats, monthSummaries, pendingLeaves, pendingRegularizations, payrollSetting, teamBirthdays, todayAttendance] =
    await Promise.all([
      getLeaveStats(employee.id, businessId),
      getCalendar({ businessId, employeeId: employee.id, month }),
      LeaveRequest.count({ where: { employeeId: employee.id, status: 'PENDING' } }),
      AttendanceRegularization.count({ where: { employeeId: employee.id, status: 'PENDING' } }),
      PayrollSetting.findOne({ where: { businessId } }),
      getTeamBirthdays(businessId, employee.id),
      getTodayAttendanceWidget(employee),
    ]);

  const workedDays = monthSummaries.filter(
    (s) => s.status === 'PRESENT' || s.status === 'HALF_DAY'
  ).length;

  const workingDaysSoFar = countWorkingDaysInMonth(now);
  const attendanceRate =
    workingDaysSoFar > 0 ? Math.round((workedDays / workingDaysSoFar) * 100) : 0;

  const streak = computeStreak(monthSummaries);
  const payday = daysUntilPayday(payrollSetting?.payDay || 25);

  const totalLeaveAvailable = (leaveStats.balances || []).reduce(
    (sum, b) => sum + Number(b.available || 0),
    0
  );

  const joinDate = employee.empDateOfJoining ? new Date(employee.empDateOfJoining) : now;
  const tenureMonths = Math.max(
    0,
    (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth())
  );

  const reputation = computeReputation({
    streak,
    attendanceRate,
    pendingLeaves,
    tenureMonths,
  });

  const monthlyCtc = Number(employee.empCtc || 0);
  const estimatedMonthly = monthlyCtc > 0 ? Math.round(monthlyCtc / 12) : null;

  return {
    greeting: getGreeting(),
    workedDaysThisMonth: workedDays,
    salaryInDays: payday.days,
    payDay: payday.payDay,
    attendanceStreak: streak,
    attendanceRate,
    remainingLeave: totalLeaveAvailable,
    pendingApprovals: pendingLeaves + pendingRegularizations,
    pendingLeaves,
    pendingRegularizations,
    estimatedMonthlySalary: estimatedMonthly,
    reputation,
    teamBirthdays,
    announcements: getAnnouncements(employee, payday.days),
    tasksSummary: { pending: 0, completed: 0, total: 0 },
    today,
    todayAttendance,
    leaveBalances: (leaveStats.balances || []).map((b) => ({
      id: b.leaveTypeId,
      name: b.leaveTypeName,
      available: Number(b.available || 0),
      used: Number(b.used || 0),
      total: Number(b.allocated || 0),
      color: b.color || '#6366f1',
    })),
  };
}

function countWorkingDaysInMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const today = date.getDate();
  let count = 0;
  for (let d = 1; d <= today; d++) {
    const day = new Date(year, month, d).getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

async function getTeamBirthdays(businessId, excludeEmployeeId) {
  const now = new Date();
  const month = now.getMonth() + 1;

  const teammates = await Employee.findAll({
    where: {
      businessId,
      id: { [Op.ne]: excludeEmployeeId },
      empDob: { [Op.ne]: null },
      employmentStatus: { [Op.in]: ['Active', 'ACTIVE', 'active'] },
    },
    attributes: ['id', 'firstName', 'lastName', 'empName', 'empDob', 'empDepartment', 'empDesignation'],
    limit: 50,
  });

  return teammates
    .filter((e) => {
      const dob = new Date(e.empDob);
      return dob.getMonth() + 1 === month;
    })
    .map((e) => ({
      id: e.id,
      name: e.empName || `${e.firstName} ${e.lastName}`,
      department: e.empDepartment,
      designation: e.empDesignation,
      day: new Date(e.empDob).getDate(),
      date: e.empDob,
    }))
    .sort((a, b) => a.day - b.day)
    .slice(0, 5);
}

function getAnnouncements(employee, salaryInDays) {
  const items = [
    {
      id: 1,
      title: 'Welcome to your employee portal',
      body: 'Track attendance, apply leaves, and view payslips — all in one place.',
      type: 'info',
      date: new Date().toISOString().split('T')[0],
    },
  ];

  if (salaryInDays <= 7) {
    items.unshift({
      id: 2,
      title: `Salary processing in ${salaryInDays} day${salaryInDays === 1 ? '' : 's'}`,
      body: 'Your payslip will be available once payroll is processed.',
      type: 'salary',
      date: new Date().toISOString().split('T')[0],
    });
  }

  if (employee.empDepartment) {
    items.push({
      id: 3,
      title: `${employee.empDepartment} team update`,
      body: 'Keep your attendance regular and leave balances up to date.',
      type: 'team',
      date: new Date().toISOString().split('T')[0],
    });
  }

  return items.slice(0, 4);
}

export function parseSkills(employee) {
  const skills = [];
  if (employee.languagesKnown) {
    employee.languagesKnown.split(/[,;|]/).forEach((s) => {
      const trimmed = s.trim();
      if (trimmed) skills.push({ name: trimmed, level: 'Proficient', category: 'Language' });
    });
  }
  if (employee.empDesignation) {
    skills.push({ name: employee.empDesignation, level: 'Primary', category: 'Role' });
  }
  if (employee.empDepartment) {
    skills.push({ name: employee.empDepartment, level: 'Domain', category: 'Department' });
  }
  return skills;
}

export function buildCareerJourney(employee, experiences = []) {
  const journey = [];

  if (employee.empDateOfJoining) {
    journey.push({
      type: 'join',
      title: `Joined ${employee.business?.businessName || 'the company'}`,
      subtitle: employee.empDesignation || 'Employee',
      date: employee.empDateOfJoining,
      icon: 'fa-building',
      color: '#0ea5e9',
    });
  }

  experiences
    .slice()
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
    .forEach((exp) => {
      journey.push({
        type: 'experience',
        title: exp.jobTitle,
        subtitle: exp.organizationName,
        date: exp.startDate,
        endDate: exp.isCurrent ? null : exp.endDate,
        icon: 'fa-briefcase',
        color: '#8b5cf6',
      });
    });

  journey.sort((a, b) => new Date(b.date) - new Date(a.date));
  return journey;
}

export function getCertificates(documents = []) {
  return documents.filter(
    (d) =>
      /cert|license|course|training|diploma/i.test(d.documentType || '') ||
      /cert|education|training/i.test(d.category || '')
  );
}
