/**
 * Employee Home Dashboard — widget sync & live attendance
 */
(function () {
  'use strict';

  const OVERVIEW_API = '/employee/api/dashboard/overview';
  const TODAY_API = '/employee/attendance/api/today-summary';
  let refreshIntervals = {};

  function statusClass(status) {
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

  function formatStatusLabel(status) {
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

  function formatTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatWorkDuration(minutes) {
    const m = Number(minutes) || 0;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    if (h === 0) return `${rem}m`;
    return `${h}h ${rem}m`;
  }

  function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el && value !== undefined && value !== null) el.textContent = value;
  }

  function updateAttendanceWidget(todayData, overviewData) {
    const att = todayData || overviewData?.todayAttendance;
    if (!att) return;

    const status = att.status || todayData?.summary?.status || 'NOT_MARKED';
    const statusEl = document.querySelector('[data-attendance-status]');
    if (statusEl) {
      statusEl.textContent = att.statusLabel || formatStatusLabel(status);
      statusEl.className = `emp-widget-status emp-widget-status-${statusClass(status)}`;
    }

    const clockIn = att.clockIn ?? formatTime(todayData?.summary?.firstInAt);
    const clockOut = att.clockOut ?? formatTime(todayData?.summary?.lastOutAt);
    const workMinutes = att.workMinutes ?? todayData?.summary?.workMinutes;

    setText('[data-attendance-in]', clockIn || '—');
    setText('[data-attendance-out]', clockOut || '—');
    setText('[data-attendance-worked]', att.workDuration || formatWorkDuration(workMinutes));
  }

  function updateLeaveWidget(data) {
    if (!data) return;
    setText('[data-leave-total]', data.remainingLeave);

    const list = document.getElementById('leaveBalanceList');
    if (!list || !data.leaveBalances?.length) return;

    data.leaveBalances.forEach((b) => {
      const el = document.querySelector(`[data-leave-type="${b.id}"]`);
      if (el) el.textContent = b.available;
    });
  }

  function updateSalaryWidget(data) {
    if (!data) return;
    setText('[data-salary-days]', data.salaryInDays);
    if (data.estimatedMonthlySalary) {
      setText('[data-salary-estimate]', `₹${data.estimatedMonthlySalary}`);
    }
  }

  function updateTasksWidget(data) {
    if (!data?.tasksSummary) return;
    setText('[data-tasks-pending]', data.tasksSummary.pending ?? 0);
    setText('[data-tasks-completed]', data.tasksSummary.completed ?? 0);
  }

  async function fetchOverview() {
    const res = await fetch(OVERVIEW_API, { credentials: 'include' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  }

  async function fetchTodaySummary() {
    const res = await fetch(TODAY_API, { credentials: 'include' });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;
    return json;
  }

  async function loadHomeDashboard() {
    try {
      const [overview, today] = await Promise.all([fetchOverview(), fetchTodaySummary()]);

      if (overview) {
        updateLeaveWidget(overview);
        updateSalaryWidget(overview);
        updateTasksWidget(overview);
      }

      if (today?.summary) {
        updateAttendanceWidget(
          {
            status: today.summary.status,
            clockIn: formatTime(today.summary.firstInAt),
            clockOut: formatTime(today.summary.lastOutAt),
            workMinutes: 0,
          },
          overview
        );
      } else if (overview) {
        updateAttendanceWidget(overview.todayAttendance, overview);
      }
    } catch (e) {
      console.warn('Home dashboard refresh failed:', e);
    }
  }

  async function refreshAttendanceOnly() {
    try {
      const today = await fetchTodaySummary();
      if (today?.summary) {
        updateAttendanceWidget({
          status: today.summary.status,
          statusLabel: formatStatusLabel(today.summary.status),
          clockIn: formatTime(today.summary.firstInAt),
          clockOut: formatTime(today.summary.lastOutAt),
        });
      }
    } catch (e) {
      console.warn('Attendance refresh failed:', e);
    }
  }

  function setupAutoRefresh(fn, intervalMs) {
    fn().catch(() => {});
    const key = fn.name || 'refresh';
    if (refreshIntervals[key]) clearInterval(refreshIntervals[key]);
    refreshIntervals[key] = setInterval(() => fn().catch(() => {}), intervalMs);
  }

  function init() {
    if (!window.location.pathname.includes('/employee/dashboard')) return;

    const dateEl = document.getElementById('empHomeDate');
    if (dateEl && dateEl.textContent) {
      try {
        const d = new Date(dateEl.textContent.trim());
        if (!Number.isNaN(d.getTime())) {
          dateEl.textContent = d.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
        }
      } catch (_) {
        /* keep raw date */
      }
    }

    setupAutoRefresh(loadHomeDashboard, 30000);
    setupAutoRefresh(refreshAttendanceOnly, 15000);
  }

  document.addEventListener('DOMContentLoaded', init);

  window.addEventListener('beforeunload', () => {
    Object.values(refreshIntervals).forEach(clearInterval);
  });
})();
