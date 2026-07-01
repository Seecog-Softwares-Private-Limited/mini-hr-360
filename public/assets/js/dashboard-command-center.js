/**
 * Dashboard Command Center — actionable HR/Admin sections
 */
(function () {
  'use strict';

  const SECTION_ICONS = {
    setupCompletion: { icon: 'fa-clipboard-check', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
    payrollReadiness: { icon: 'fa-money-check-dollar', gradient: 'linear-gradient(135deg,#10b981,#14b8a6)' },
    pendingApprovals: { icon: 'fa-hourglass-half', gradient: 'linear-gradient(135deg,#f59e0b,#f97316)' },
    employeesMissingData: { icon: 'fa-user-pen', gradient: 'linear-gradient(135deg,#ec4899,#f43f5e)' },
    attendanceExceptions: { icon: 'fa-user-clock', gradient: 'linear-gradient(135deg,#0ea5e9,#22c55e)' },
    upcomingPayroll: { icon: 'fa-calendar-check', gradient: 'linear-gradient(135deg,#8b5cf6,#6366f1)' },
    complianceDueDates: { icon: 'fa-scale-balanced', gradient: 'linear-gradient(135deg,#64748b,#475569)' },
    documentExpiryAlerts: { icon: 'fa-file-circle-exclamation', gradient: 'linear-gradient(135deg,#ef4444,#f97316)' },
    leaveConflicts: { icon: 'fa-calendar-xmark', gradient: 'linear-gradient(135deg,#f43f5e,#ec4899)' },
    recentAdminChanges: { icon: 'fa-clock-rotate-left', gradient: 'linear-gradient(135deg,#6366f1,#3b82f6)' },
  };

  let centerData = null;
  let isLoading = true;
  let loadError = null;
  let pollTimer = null;

  function unwrapApi(result) {
    return result?.data ?? result;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function statusLabel(status) {
    if (status === 'good') return 'Good';
    if (status === 'warning') return 'Warning';
    return 'Critical';
  }

  function loadingCard(id) {
    const meta = SECTION_ICONS[id] || { icon: 'fa-circle', gradient: '#6366f1' };
    return `
      <article class="cc-card cc-card--loading" data-cc="${id}">
        <div class="cc-card-header">
          <div class="cc-card-title">
            <i class="fas ${meta.icon}" style="background:${meta.gradient}"></i>
            <span>Loading…</span>
          </div>
        </div>
        <div class="cc-card-body">
          <div class="insight-skeleton insight-skeleton-line"></div>
          <div class="insight-skeleton insight-skeleton-line short"></div>
          <div class="insight-skeleton insight-skeleton-line"></div>
        </div>
      </article>
    `;
  }

  function renderBlockers(section) {
    if (!section.blockers?.length) return '';
    const intro = section.status === 'good' ? '' : '<p class="cc-blockers-intro">Key items:</p>';
    return `
      ${intro}
      <ul class="cc-blockers">
        ${section.blockers.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}
      </ul>
    `;
  }

  function renderItems(section) {
    if (!section.items?.length) return '';
    return `
      <div class="cc-items">
        ${section.items
          .map(
            (item) => `
          <a href="${escapeHtml(item.href || '#')}" class="cc-item">
            <span class="cc-item-title">${escapeHtml(item.title)}</span>
            <span class="cc-item-sub">${escapeHtml(item.subtitle)}</span>
          </a>
        `
          )
          .join('')}
      </div>
    `;
  }

  function renderCard(section) {
    const meta = SECTION_ICONS[section.id] || { icon: 'fa-circle', gradient: '#6366f1' };
    const metricValue = section.metric?.value ?? '—';
    const metricLabel = section.metric?.label ?? '';
    const action = section.action || { label: 'View Details', href: '/dashboard' };

    return `
      <article class="cc-card cc-card--${section.status}" data-cc="${escapeHtml(section.id)}">
        <div class="cc-card-header">
          <div class="cc-card-title">
            <i class="fas ${meta.icon}" style="background:${meta.gradient}"></i>
            <span>${escapeHtml(section.title)}</span>
          </div>
          <div class="cc-metric">
            <div class="cc-metric-value">${escapeHtml(metricValue)}</div>
            <div class="cc-metric-label">${escapeHtml(metricLabel)}</div>
          </div>
        </div>
        <div class="cc-card-body">
          <div class="cc-status cc-status--${section.status}">
            <span class="cc-status-dot" aria-hidden="true"></span>
            ${escapeHtml(statusLabel(section.status))}
          </div>
          <p class="cc-summary">${escapeHtml(section.summary)}</p>
          ${renderBlockers(section)}
          ${renderItems(section)}
          <a href="${escapeHtml(action.href)}" class="cc-action-btn">
            ${escapeHtml(action.label)} <i class="fas fa-arrow-right" aria-hidden="true"></i>
          </a>
        </div>
      </article>
    `;
  }

  function renderPanel() {
    const panel = document.getElementById('dashboardCommandCenter');
    if (!panel) return;

    if (loadError) {
      panel.innerHTML = `
        <div class="cc-error">
          <i class="fas fa-triangle-exclamation"></i>
          <p>Could not load command center</p>
          <p class="cc-error-detail">${escapeHtml(loadError)}</p>
          <button type="button" class="btn btn-sm btn-outline-primary" id="ccRetryBtn">Retry</button>
        </div>
      `;
      document.getElementById('ccRetryBtn')?.addEventListener('click', fetchCommandCenter);
      return;
    }

    if (isLoading) {
      const ids = Object.keys(SECTION_ICONS);
      panel.innerHTML = ids.map((id) => loadingCard(id)).join('');
      return;
    }

    const sections = centerData?.sections || [];
    if (!sections.length) {
      panel.innerHTML = `
        <div class="cc-empty">
          <i class="fas fa-check-circle"></i>
          <p>No command center data available</p>
        </div>
      `;
      return;
    }

    panel.innerHTML = sections.map((s) => renderCard(s)).join('');
  }

  async function fetchCommandCenter() {
    isLoading = !centerData;
    loadError = null;
    renderPanel();

    try {
      const result = await apiCall('/dashboard/command-center', { method: 'GET' });
      centerData = unwrapApi(result);
      isLoading = false;
      loadError = null;
    } catch (err) {
      loadError = err?.message || 'Please try again';
      isLoading = false;
    }

    renderPanel();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('dashboardCommandCenter')) return;
    fetchCommandCenter();
    pollTimer = setInterval(fetchCommandCenter, 120000);
  });

  window.addEventListener('beforeunload', () => {
    if (pollTimer) clearInterval(pollTimer);
  });
})();
