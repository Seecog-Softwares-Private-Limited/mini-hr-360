/**
 * Dashboard insights panel — decision center cards
 */
(function () {
  'use strict';

  const CARDS = {
    approvals: {
      title: 'Pending Approvals',
      icon: 'fa-hourglass-half',
      gradient: 'linear-gradient(135deg,#f59e0b,#f97316)',
      viewAll: '/leave-requests?status=PENDING',
    },
    birthdays: {
      title: 'Upcoming Birthdays',
      icon: 'fa-cake-candles',
      gradient: 'linear-gradient(135deg,#ec4899,#f43f5e)',
      viewAll: '/employees',
    },
    trend: {
      title: 'Attendance Trend',
      icon: 'fa-chart-line',
      gradient: 'linear-gradient(135deg,#0ea5e9,#22c55e)',
      viewAll: '/admin/attendance/reports',
    },
    activity: {
      title: 'Recent Activity',
      icon: 'fa-clock-rotate-left',
      gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      viewAll: '/leave-requests',
    },
    lifecycle: {
      title: 'Lifecycle Alerts',
      icon: 'fa-route',
      gradient: 'linear-gradient(135deg,#a855f7,#ec4899)',
      viewAll: '/employees',
    },
  };

  let insightsData = null;
  let isLoading = true;
  let loadError = null;

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

  function cardShell(id, def, bodyHtml) {
    return `
      <article class="insight-card" data-insight="${id}">
        <div class="insight-card-header">
          <div class="insight-card-title">
            <i class="fas ${def.icon}" style="background:${def.gradient}"></i>
            <span>${def.title}</span>
          </div>
          <a href="${def.viewAll}" class="insight-view-all">View All <i class="fas fa-arrow-right"></i></a>
        </div>
        <div class="insight-card-body" id="insight-body-${id}">
          ${bodyHtml}
        </div>
      </article>
    `;
  }

  function loadingBody() {
    return `
      <div class="insight-loading">
        <div class="insight-skeleton insight-skeleton-line"></div>
        <div class="insight-skeleton insight-skeleton-line short"></div>
        <div class="insight-skeleton insight-skeleton-line"></div>
        <div class="insight-skeleton insight-skeleton-line short"></div>
      </div>
    `;
  }

  function emptyBody(icon, message) {
    return `
      <div class="insight-empty">
        <div class="insight-empty-icon"><i class="fas ${icon}"></i></div>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  function listItem({ href, icon, title, subtitle, meta }) {
    const tag = href && href !== '#' ? 'a' : 'div';
    const hrefAttr = tag === 'a' ? ` href="${escapeHtml(href)}"` : '';
    return `
      <${tag} class="insight-list-item"${hrefAttr}>
        <div class="insight-list-icon"><i class="fas ${icon}"></i></div>
        <div class="insight-list-content">
          <div class="insight-list-title">${escapeHtml(title)}</div>
          <div class="insight-list-subtitle">${escapeHtml(subtitle)}</div>
        </div>
        ${meta ? `<div class="insight-list-meta">${escapeHtml(meta)}</div>` : ''}
      </${tag}>
    `;
  }

  function renderApprovals(data) {
    const approvals = data?.pendingApprovals;
    if (!approvals?.items?.length) {
      return emptyBody('fa-check-circle', 'No pending approvals — you\'re all caught up!');
    }

    const summary = approvals.counts
      ? `${approvals.counts.leaves || 0} leaves · ${approvals.counts.regularizations || 0} regularizations · ${approvals.counts.payrollQueries || 0} queries`
      : `${approvals.total} total`;

    return `
      <div class="insight-summary-badge">${approvals.total} pending</div>
      <div class="insight-summary-text">${escapeHtml(summary)}</div>
      <div class="insight-list">
        ${approvals.items
          .map((item) =>
            listItem({
              href: item.href,
              icon: item.icon,
              title: item.title,
              subtitle: item.subtitle,
              meta: item.timeAgo,
            })
          )
          .join('')}
      </div>
    `;
  }

  function renderBirthdays(data) {
    const items = data?.upcomingBirthdays || [];
    if (!items.length) {
      return emptyBody('fa-cake-candles', 'No birthdays or anniversaries in the next 7 days');
    }

    return `
      <div class="insight-list">
        ${items
          .map((item) => {
            const icon = item.type === 'anniversary' ? 'fa-award' : 'fa-cake-candles';
            const subtitle =
              item.type === 'anniversary'
                ? `${item.yearsOfService} year${item.yearsOfService === 1 ? '' : 's'} · ${item.department || 'Work anniversary'}`
                : item.department || 'Birthday';
            return listItem({
              href: '/employees',
              icon,
              title: item.name,
              subtitle,
              meta: item.label,
            });
          })
          .join('')}
      </div>
    `;
  }

  function renderTrend(data) {
    const trend = data?.attendanceTrend || [];
    if (!trend.length) {
      return emptyBody('fa-chart-line', 'No attendance data for the past week');
    }

    const maxVal = Math.max(
      1,
      ...trend.map((d) => d.present + d.absent + d.late + d.onLeave)
    );

    const bars = trend
      .map((d) => {
        const total = d.present + d.absent + d.late + d.onLeave;
        const height = Math.round((total / maxVal) * 100);
        const presentPct = total ? Math.round((d.present / total) * 100) : 0;
        const absentPct = total ? Math.round((d.absent / total) * 100) : 0;
        const latePct = total ? Math.round((d.late / total) * 100) : 0;
        const leavePct = total ? Math.round((d.onLeave / total) * 100) : 0;

        return `
          <div class="trend-bar-col" title="${d.label}: ${d.present} present, ${d.absent} absent">
            <div class="trend-bar" style="height:${Math.max(height, 4)}%">
              ${total > 0 ? `<span class="trend-seg present" style="height:${presentPct}%"></span>
              <span class="trend-seg absent" style="height:${absentPct}%"></span>
              <span class="trend-seg late" style="height:${latePct}%"></span>
              <span class="trend-seg leave" style="height:${leavePct}%"></span>` : ''}
            </div>
            <div class="trend-label">${escapeHtml(d.label)}</div>
          </div>
        `;
      })
      .join('');

    const totals = trend.reduce(
      (acc, d) => {
        acc.present += d.present;
        acc.absent += d.absent;
        return acc;
      },
      { present: 0, absent: 0 }
    );

    return `
      <div class="trend-chart">${bars}</div>
      <div class="trend-legend">
        <span><i class="trend-dot present"></i> Present</span>
        <span><i class="trend-dot absent"></i> Absent</span>
        <span><i class="trend-dot late"></i> Late</span>
        <span><i class="trend-dot leave"></i> On leave</span>
      </div>
      <div class="insight-summary-text">7-day total: ${totals.present} present · ${totals.absent} absent</div>
    `;
  }

  function renderActivity(data) {
    const items = data?.recentActivity || [];
    if (!items.length) {
      return emptyBody('fa-inbox', 'No recent activity in this organization');
    }

    return `
      <div class="insight-list">
        ${items
          .map((item) =>
            listItem({
              href: item.href,
              icon: item.icon,
              title: item.title,
              subtitle: item.subtitle,
              meta: item.timeAgo,
            })
          )
          .join('')}
      </div>
    `;
  }

  function renderLifecycle(data) {
    const alerts = data?.lifecycleAlerts;
    const pipeline = data?.lifecyclePipeline || {};
    const items = [
      ...(pipeline.offersPending > 0
        ? [{
            href: '/document-approvals',
            icon: 'fa-file-signature',
            title: `${pipeline.offersPending} offer(s) pending approval`,
            subtitle: 'Review before email to candidates',
            meta: 'HR',
          }]
        : []),
      ...(pipeline.unacknowledgedOffers > 0
        ? [{
            href: '/employees?lifecycleStage=offer',
            icon: 'fa-envelope-open',
            title: `${pipeline.unacknowledgedOffers} unacknowledged offer letter(s)`,
            subtitle: 'Employees have not accepted via portal',
            meta: '',
          }]
        : []),
      ...(alerts?.exitsInProgress || []).map((e) => ({
        href: e.href,
        icon: 'fa-door-open',
        title: e.empName,
        subtitle: `Exit in progress · LWD ${e.lastWorkingDay || '—'}`,
        meta: '',
      })),
      ...(alerts?.probationEnding || []).slice(0, 3).map((e) => ({
        href: `/onboarding-workflow/${e.id}`,
        icon: 'fa-hourglass-half',
        title: e.empName,
        subtitle: `Probation ends ${e.probationEndDate}`,
        meta: `${e.daysRemaining}d`,
      })),
      ...(alerts?.contractEnding || []).slice(0, 3).map((e) => ({
        href: e.href,
        icon: 'fa-file-contract',
        title: e.empName,
        subtitle: `Contract ends ${e.contractEndDate}`,
        meta: `${e.daysRemaining}d`,
      })),
    ];

    if (!items.length) {
      return emptyBody('fa-check-circle', 'No probation, contract, or exit alerts');
    }

    const c = alerts?.counts || {};
    return `
      <div class="insight-summary-badge">${(c.exitsInProgress || 0) + (c.probationEnding || 0) + (c.contractEnding || 0)} alerts</div>
      <div class="insight-summary-text">${c.exitsInProgress || 0} exits · ${c.probationEnding || 0} probation · ${c.contractEnding || 0} contracts</div>
      <div class="insight-list">
        ${items.slice(0, 6).map((item) => listItem(item)).join('')}
      </div>
    `;
  }

  const RENDERERS = {
    approvals: renderApprovals,
    birthdays: renderBirthdays,
    trend: renderTrend,
    activity: renderActivity,
    lifecycle: renderLifecycle,
  };

  function renderPanel() {
    const panel = document.getElementById('dashboardInsights');
    if (!panel) return;

    if (isLoading) {
      panel.innerHTML = Object.entries(CARDS)
        .map(([id, def]) => cardShell(id, def, loadingBody()))
        .join('');
      return;
    }

    if (loadError) {
      panel.innerHTML = `
        <div class="insight-error-state">
          <i class="fas fa-triangle-exclamation"></i>
          <p>Could not load insights. ${escapeHtml(loadError)}</p>
          <button type="button" class="btn btn-sm btn-outline-primary" id="insightsRetryBtn">Retry</button>
        </div>
      `;
      document.getElementById('insightsRetryBtn')?.addEventListener('click', refreshInsights);
      return;
    }

    panel.innerHTML = Object.entries(CARDS)
      .map(([id, def]) => cardShell(id, def, RENDERERS[id](insightsData)))
      .join('');
  }

  async function fetchInsights() {
    isLoading = true;
    loadError = null;
    renderPanel();

    try {
      const result = await apiCall('/dashboard/insights', { method: 'GET' });
      insightsData = unwrapApi(result);
      isLoading = false;
    } catch (err) {
      console.error('Failed to load insights:', err);
      loadError = err.message || 'Please try again';
      insightsData = null;
      isLoading = false;
    }

    renderPanel();
  }

  function refreshInsights() {
    return fetchInsights();
  }

  function init() {
    const panel = document.getElementById('dashboardInsights');
    if (!panel) return;

    fetchInsights();
    setInterval(() => refreshInsights().catch(() => {}), 120000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
