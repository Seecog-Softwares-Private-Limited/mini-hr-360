/**
 * Employee Dashboard — real-time KPI sync
 */

const EMP_OVERVIEW_API = '/employee/api/dashboard/overview';
let refreshIntervals = {};

async function fetchOverview() {
  try {
    const res = await fetch(EMP_OVERVIEW_API, { credentials: 'include' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (e) {
    console.warn('Overview fetch failed:', e);
    return null;
  }
}

function updateKpi(selector, value) {
  const el = document.querySelector(`[data-kpi="${selector}"]`);
  if (el && value !== undefined && value !== null) el.textContent = value;
}

async function loadDashboardOverview() {
  const data = await fetchOverview();
  if (!data) return;

  updateKpi('streak', data.attendanceStreak);
  updateKpi('salaryDays', `${data.salaryInDays}d`);
  updateKpi('leaveBalance', data.remainingLeave);
  updateKpi('pendingApprovals', data.pendingApprovals);
  updateKpi('tasks', data.tasksSummary?.pending ?? 0);
}

function setupAutoRefresh(fn, intervalMs = 30000) {
  fn().catch(() => {});
  const key = fn.name || 'refresh';
  if (refreshIntervals[key]) clearInterval(refreshIntervals[key]);
  refreshIntervals[key] = setInterval(() => fn().catch(() => {}), intervalMs);
}

document.addEventListener('DOMContentLoaded', () => {
  const page = window.location.pathname;
  if (page.includes('/employee/dashboard')) {
    setupAutoRefresh(loadDashboardOverview, 30000);
  }
});

window.addEventListener('beforeunload', () => {
  Object.values(refreshIntervals).forEach(clearInterval);
});
