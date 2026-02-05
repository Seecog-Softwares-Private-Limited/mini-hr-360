/**
 * Employee Dashboard - Real-time Sync
 * Syncs employee dashboard with admin attendance system data
 */

// Employee portal must use employee attendance APIs (admin APIs require admin auth)
const EMP_ATTENDANCE_API_BASE = '/employee/attendance/api';
let refreshIntervals = {};

// ==================== UTILITIES ====================

async function employeeApiCall(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(EMP_ATTENDANCE_API_BASE + endpoint, options);
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn(`API returned ${contentType || 'non-JSON'} on endpoint ${endpoint}`);
      return null;
    }
    
    const data = await response.json();
    if (!response.ok) return null;
    
    return data.data || data;
  } catch (error) {
    console.error('Employee Attendance API error on', endpoint, error);
    return null;
  }
}

function setupAutoRefresh(loadFunction, intervalMs = 10000) {
  // Call function immediately
  loadFunction().catch(e => console.warn('Initial load error:', e));
  
  // Clear any existing interval
  if (refreshIntervals[loadFunction.name]) {
    clearInterval(refreshIntervals[loadFunction.name]);
  }
  
  // Set up new interval
  refreshIntervals[loadFunction.name] = setInterval(() => {
    loadFunction().catch(e => console.warn('Auto-refresh error:', e));
  }, intervalMs);
  
  console.log(`✅ Real-time sync started for ${loadFunction.name} (${intervalMs}ms)`);
}

// ==================== TODAY'S ATTENDANCE ====================

async function loadTodayAttendance() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const data = await employeeApiCall('/today-summary');
    if (data && data.summary) renderTodayAttendance({ ...data.summary, date: today });
  } catch (e) {
    console.error('Failed to load today attendance:', e);
  }
}

function renderTodayAttendance(data) {
  const statusDisplay = document.getElementById('statusDisplay');
  const checkInDisplay = document.getElementById('checkInDisplay');
  const checkOutDisplay = document.getElementById('checkOutDisplay') || document.querySelector('[data-metric="punchOut"]');
  
  if (statusDisplay) statusDisplay.innerHTML = `<span class="badge ${
    data.status === 'PRESENT' ? 'bg-success' :
    data.status === 'ABSENT' ? 'bg-danger' :
    'bg-warning'
  }">${data.status || 'UNKNOWN'}</span>`;
  
  if (checkInDisplay) checkInDisplay.textContent = data.firstInAt ? new Date(data.firstInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
  if (checkOutDisplay) checkOutDisplay.textContent = data.lastOutAt ? new Date(data.lastOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
}

// ==================== ATTENDANCE CALENDAR ====================

async function loadAttendanceCalendar() {
  try {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const data = await employeeApiCall(`/month-summary?month=${month}`);
    if (data?.data) updateCalendarData(data.data);
  } catch (e) {
    console.error('Failed to load calendar:', e);
  }
}

function updateCalendarData(logs) {
  if (!Array.isArray(logs)) return;
  
  const presentCount = logs.filter(l => l.status === 'PRESENT').length;
  const absentCount = logs.filter(l => l.status === 'ABSENT').length;
  const lateCount = logs.filter(l => l.lateMinutes > 0).length;
  
  const presentEl = document.getElementById('presentCount');
  const absentEl = document.getElementById('absentCount');
  const lateEl = document.getElementById('lateCount') || document.getElementById('pendingCount');
  
  if (presentEl) presentEl.textContent = presentCount;
  if (absentEl) absentEl.textContent = absentCount;
  if (lateEl) lateEl.textContent = lateCount;
}

// ==================== REGULARIZATIONS ====================

async function loadMyRegularizations() {
  try {
    const data = await employeeApiCall('/regularizations');
    renderRegularizations(Array.isArray(data?.data) ? data.data : []);
  } catch (e) {
    console.error('Failed to load regularizations:', e);
  }
}

function renderRegularizations(regs) {
  const tbody = document.getElementById('regularizationTableBody');
  if (!tbody) return;
  
  if (!regs || regs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No pending regularizations</td></tr>';
    return;
  }
  
  tbody.innerHTML = regs.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.date || '-'}</td>
      <td>${r.reason || '-'}</td>
      <td><span class="badge ${r.status === 'PENDING' ? 'bg-warning' : r.status === 'APPROVED' ? 'bg-success' : 'bg-danger'}">${r.status || 'PENDING'}</span></td>
    </tr>
  `).join('');
}

// ==================== DASHBOARD SUMMARY ====================

async function loadDashboardSummary() {
  try {
    // Employee dashboard doesn't have a dedicated KPI endpoint; keep this safe/no-op unless elements exist
    const data = await employeeApiCall('/today-summary');
    renderDashboardSummary(data?.summary || {});
  } catch (e) {
    console.error('Failed to load dashboard summary:', e);
  }
}

function renderDashboardSummary(data) {
  const presentEl = document.querySelector('[data-kpi="present"]');
  const absentEl = document.querySelector('[data-kpi="absent"]');
  const lateEl = document.querySelector('[data-kpi="late"]');
  const onLeaveEl = document.querySelector('[data-kpi="onLeave"]');
  
  // Best-effort mapping based on today's summary
  if (presentEl) presentEl.textContent = data.status === 'PRESENT' ? 1 : 0;
  if (absentEl) absentEl.textContent = data.status === 'ABSENT' ? 1 : 0;
  if (lateEl) lateEl.textContent = 0;
  if (onLeaveEl) onLeaveEl.textContent = data.status === 'LEAVE' ? 1 : 0;
}

// ==================== AUTO-START REAL-TIME SYNC ====================

// Initialize real-time sync based on current page
document.addEventListener('DOMContentLoaded', () => {
  const page = window.location.pathname;
  console.log('🔄 Employee dashboard initializing on page:', page);

  // Attendance pages already include their own realtime scripts; don't double-fetch.
  if (page.includes('/employee/attendance/')) {
    return;
  }
  
  // Start appropriate auto-refresh based on current page
  if (page.includes('/employee/dashboard')) {
    setupAutoRefresh(loadDashboardSummary, 5000); // Refresh every 5 seconds
  } else if (page.includes('/employee/attendance/today')) {
    setupAutoRefresh(loadTodayAttendance, 3000); // Fastest: every 3 seconds
  } else if (page.includes('/employee/attendance/calendar')) {
    setupAutoRefresh(loadAttendanceCalendar, 10000); // Every 10 seconds
  } else if (page.includes('/employee/attendance/regularizations')) {
    setupAutoRefresh(loadMyRegularizations, 6000); // Every 6 seconds
  }
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    Object.keys(refreshIntervals).forEach(key => clearInterval(refreshIntervals[key]));
  });
});
