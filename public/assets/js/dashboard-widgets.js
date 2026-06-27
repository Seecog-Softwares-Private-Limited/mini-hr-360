/**
 * Configurable HR dashboard widgets — reorder, hide/show, localStorage prefs
 */
(function () {
  'use strict';

  const PREFS_KEY = 'mh360:dashboard-widgets';
  const DEFAULT_ORDER = ['employees', 'lifecycle', 'attendance', 'leaves', 'payroll', 'tasks'];

  const WIDGET_DEFS = {
    employees: {
      title: 'Employees',
      icon: 'fa-users',
      gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      href: '/employees',
      linkLabel: 'Manage employees',
    },
    lifecycle: {
      title: 'Lifecycle',
      icon: 'fa-route',
      gradient: 'linear-gradient(135deg,#a855f7,#ec4899)',
      href: '/candidates',
      linkLabel: 'Hiring pipeline',
    },
    attendance: {
      title: 'Attendance',
      icon: 'fa-clock',
      gradient: 'linear-gradient(135deg,#0ea5e9,#22c55e)',
      href: '/admin/attendance',
      linkLabel: 'Attendance dashboard',
    },
    leaves: {
      title: 'Leaves',
      icon: 'fa-calendar-days',
      gradient: 'linear-gradient(135deg,#f59e0b,#f97316)',
      href: '/leave-requests',
      linkLabel: 'Leave requests',
    },
    payroll: {
      title: 'Payroll',
      icon: 'fa-money-bill-wave',
      gradient: 'linear-gradient(135deg,#10b981,#22c55e)',
      href: '/admin/payroll/runs',
      linkLabel: 'Payroll runs',
    },
    tasks: {
      title: 'Tasks',
      icon: 'fa-list-check',
      gradient: 'linear-gradient(135deg,#3b82f6,#06b6d4)',
      href: null,
      linkLabel: 'Coming soon',
    },
  };

  let widgetData = null;
  let isEditing = false;
  let dragId = null;

  function getPrefs() {
    try {
      const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      const order = Array.isArray(raw.order)
        ? raw.order.filter((id) => DEFAULT_ORDER.includes(id))
        : [];
      const hidden = Array.isArray(raw.hidden)
        ? raw.hidden.filter((id) => DEFAULT_ORDER.includes(id))
        : [];

      DEFAULT_ORDER.forEach((id) => {
        if (!order.includes(id) && !hidden.includes(id)) order.push(id);
      });

      return { order, hidden };
    } catch {
      return { order: [...DEFAULT_ORDER], hidden: [] };
    }
  }

  function savePrefs(prefs) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }

  function unwrapApi(result) {
    return result?.data ?? result;
  }

  async function fetchWidgetData() {
    try {
      const result = await apiCall('/dashboard/widgets', { method: 'GET' });
      widgetData = unwrapApi(result);
    } catch (err) {
      console.error('Failed to load widget data:', err);
      widgetData = null;
    }
  }

  function formatCurrency(amount) {
    if (!amount) return '₹0';
    return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  function renderEmployees(data) {
    const d = data?.employees || {};
    return `
      <div class="widget-primary-value" data-kpi="employees-active">${d.active ?? 0}</div>
      <div class="widget-secondary-line">Active employees</div>
      <div class="widget-metrics">
        <div class="widget-metric">Total<strong data-kpi="employees-total">${d.total ?? 0}</strong></div>
        <div class="widget-metric">Inactive<strong data-kpi="employees-inactive">${d.inactive ?? 0}</strong></div>
      </div>
    `;
  }

  function renderAttendance(data) {
    const d = data?.attendance || {};
    return `
      <div class="widget-primary-value" data-kpi="attendance-present">${d.present ?? 0}</div>
      <div class="widget-secondary-line">Present today</div>
      <div class="widget-metrics">
        <div class="widget-metric">Absent<strong data-kpi="attendance-absent">${d.absent ?? 0}</strong></div>
        <div class="widget-metric">Late<strong data-kpi="attendance-late">${d.late ?? 0}</strong></div>
        <div class="widget-metric">On leave<strong data-kpi="attendance-onleave">${d.onLeave ?? 0}</strong></div>
      </div>
    `;
  }

  function renderLeaves(data) {
    const d = data?.leaves || {};
    return `
      <div class="widget-primary-value" data-kpi="leaves-pending">${d.pending ?? 0}</div>
      <div class="widget-secondary-line">Pending approvals</div>
      <div class="widget-metrics">
        <div class="widget-metric">Approved<strong data-kpi="leaves-approved">${d.approved ?? 0}</strong></div>
        <div class="widget-metric">Rejected<strong data-kpi="leaves-rejected">${d.rejected ?? 0}</strong></div>
      </div>
    `;
  }

  function renderPayroll(data) {
    const d = data?.payroll || {};
    const run = d.latestRun;
    const status = run?.status || 'No runs';
    const period = run?.period || '—';
    return `
      <div class="widget-primary-value" data-kpi="payroll-status">${status}</div>
      <div class="widget-secondary-line">Latest run · ${period}</div>
      <div class="widget-metrics">
        <div class="widget-metric">Employees<strong data-kpi="payroll-employees">${run?.employeeCount ?? 0}</strong></div>
        <div class="widget-metric">Net pay<strong data-kpi="payroll-net">${formatCurrency(run?.totalNetPay)}</strong></div>
        <div class="widget-metric">Queries<strong data-kpi="payroll-queries">${d.pendingQueries ?? 0}</strong></div>
      </div>
    `;
  }

  function renderLifecycle(data) {
    const d = data?.lifecycle || {};
    const stages = d.stageBreakdown || {};
    const stageLine = ['offer', 'joining', 'active', 'offboarding']
      .filter((k) => (stages[k] || 0) > 0)
      .map((k) => `${k}: ${stages[k]}`)
      .join(' · ');
    return `
      <div class="widget-primary-value" data-kpi="lifecycle-offers">${d.offersPending ?? 0}</div>
      <div class="widget-secondary-line">Offers pending approval</div>
      <div class="widget-metrics">
        <div class="widget-metric">Onboarding<strong data-kpi="lifecycle-onboarding">${d.onboardingInProgress ?? 0}</strong></div>
        <div class="widget-metric">Exits<strong data-kpi="lifecycle-exits">${d.exitsInProgress ?? 0}</strong></div>
        <div class="widget-metric">Probation<strong data-kpi="lifecycle-probation">${d.probationEndingSoon ?? 0}</strong></div>
        <div class="widget-metric">Contracts<strong data-kpi="lifecycle-contracts">${d.contractEndingSoon ?? 0}</strong></div>
        <div class="widget-metric">Unacked offers<strong data-kpi="lifecycle-unacked">${d.unacknowledgedOffers ?? 0}</strong></div>
        <div class="widget-metric">Candidates<strong data-kpi="lifecycle-candidates">${d.candidatesProspect ?? 0}</strong></div>
      </div>
      ${stageLine ? `<div class="widget-secondary-line small mt-2">${stageLine}</div>` : ''}
    `;
  }

  function renderTasks(data) {
    const d = data?.tasks || {};
    return `
      <div class="widget-primary-value" data-kpi="tasks-pending">${d.pending ?? 0}</div>
      <div class="widget-secondary-line">Pending tasks</div>
      <div class="widget-metrics">
        <div class="widget-metric">Completed<strong data-kpi="tasks-completed">${d.completed ?? 0}</strong></div>
        <div class="widget-metric">Total<strong data-kpi="tasks-total">${d.total ?? 0}</strong></div>
      </div>
    `;
  }

  const RENDERERS = {
    employees: renderEmployees,
    lifecycle: renderLifecycle,
    attendance: renderAttendance,
    leaves: renderLeaves,
    payroll: renderPayroll,
    tasks: renderTasks,
  };

  function buildWidgetCard(id, def) {
    const body = RENDERERS[id](widgetData);
    return `
      <article class="widget-card" data-widget-id="${id}" draggable="false">
        <div class="widget-card-header">
          <div class="widget-card-title">
            <i class="${def.icon}" style="background:${def.gradient}"></i>
            <span>${def.title}</span>
          </div>
          <div class="widget-card-actions">
            <button type="button" class="widget-drag-handle" title="Drag to reorder" aria-label="Drag to reorder">
              <i class="fas fa-grip-vertical"></i>
            </button>
            <button type="button" class="widget-hide-btn" title="Hide widget" aria-label="Hide widget" data-hide="${id}">
              <i class="fas fa-eye-slash"></i>
            </button>
          </div>
        </div>
        <div class="widget-card-body" data-navigate="${def.href || ''}">
          ${body}
          ${def.href ? `<div class="widget-link">${def.linkLabel} <i class="fas fa-arrow-right"></i></div>` : `<div class="widget-link text-muted">${def.linkLabel}</div>`}
        </div>
      </article>
    `;
  }

  function renderGrid() {
    const grid = document.getElementById('dashboardWidgetGrid');
    const panel = document.getElementById('widgetHiddenPanel');
    const hiddenList = document.getElementById('widgetHiddenList');
    if (!grid) return;

    const prefs = getPrefs();
    const visible = prefs.order.filter((id) => !prefs.hidden.includes(id));

    if (visible.length === 0) {
      grid.innerHTML = `
        <div class="widget-empty-state">
          <div style="font-size:28px;margin-bottom:8px;"><i class="fas fa-puzzle-piece"></i></div>
          <div>All widgets are hidden. Restore widgets below or reset your layout.</div>
        </div>
      `;
    } else {
      grid.innerHTML = visible.map((id) => buildWidgetCard(id, WIDGET_DEFS[id])).join('');
    }

    grid.classList.toggle('is-editing', isEditing);

    if (panel && hiddenList) {
      if (prefs.hidden.length > 0 && isEditing) {
        panel.classList.add('is-open');
        hiddenList.innerHTML = prefs.hidden
          .map(
            (id) =>
              `<button type="button" class="widget-restore-btn" data-restore="${id}">
                <i class="fas fa-eye"></i> Show ${WIDGET_DEFS[id].title}
              </button>`
          )
          .join('');
      } else {
        panel.classList.remove('is-open');
        hiddenList.innerHTML = '';
      }
    }

    bindGridEvents();
  }

  function bindGridEvents() {
    const grid = document.getElementById('dashboardWidgetGrid');
    if (!grid) return;

    grid.querySelectorAll('[data-hide]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-hide');
        const prefs = getPrefs();
        if (!prefs.hidden.includes(id)) prefs.hidden.push(id);
        savePrefs(prefs);
        renderGrid();
      });
    });

    document.querySelectorAll('[data-restore]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-restore');
        const prefs = getPrefs();
        prefs.hidden = prefs.hidden.filter((h) => h !== id);
        if (!prefs.order.includes(id)) prefs.order.push(id);
        savePrefs(prefs);
        renderGrid();
      });
    });

    grid.querySelectorAll('.widget-card-body[data-navigate]').forEach((body) => {
      body.addEventListener('click', () => {
        if (isEditing) return;
        const href = body.getAttribute('data-navigate');
        if (href) window.location.href = href;
      });
    });

    if (isEditing) {
      grid.querySelectorAll('.widget-card').forEach((card) => {
        card.setAttribute('draggable', 'true');

        card.addEventListener('dragstart', (e) => {
          dragId = card.getAttribute('data-widget-id');
          card.classList.add('is-dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', dragId);
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('is-dragging');
          grid.querySelectorAll('.widget-card').forEach((c) => c.classList.remove('is-drag-over'));
          dragId = null;
        });

        card.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          card.classList.add('is-drag-over');
        });

        card.addEventListener('dragleave', () => {
          card.classList.remove('is-drag-over');
        });

        card.addEventListener('drop', (e) => {
          e.preventDefault();
          card.classList.remove('is-drag-over');
          const sourceId = e.dataTransfer.getData('text/plain') || dragId;
          const targetId = card.getAttribute('data-widget-id');
          if (!sourceId || sourceId === targetId) return;

          const prefs = getPrefs();
          const visible = prefs.order.filter((id) => !prefs.hidden.includes(id));
          const fromIdx = visible.indexOf(sourceId);
          const toIdx = visible.indexOf(targetId);
          if (fromIdx < 0 || toIdx < 0) return;

          visible.splice(fromIdx, 1);
          visible.splice(toIdx, 0, sourceId);

          const hidden = prefs.order.filter((id) => prefs.hidden.includes(id));
          prefs.order = [...visible, ...hidden.filter((id) => !visible.includes(id))];
          savePrefs(prefs);
          renderGrid();
        });
      });
    }
  }

  function setEditMode(editing) {
    isEditing = editing;
    const btn = document.getElementById('dashboardCustomizeBtn');
    const doneBtn = document.getElementById('dashboardDoneBtn');
    const resetBtn = document.getElementById('dashboardResetBtn');

    if (btn) btn.hidden = editing;
    if (doneBtn) doneBtn.hidden = !editing;
    if (resetBtn) resetBtn.hidden = !editing;

    renderGrid();
  }

  function resetLayout() {
    savePrefs({ order: [...DEFAULT_ORDER], hidden: [] });
    renderGrid();
  }

  async function refreshData() {
    await fetchWidgetData();
    renderGrid();
  }

  function init() {
    const grid = document.getElementById('dashboardWidgetGrid');
    if (!grid) return;

    document.getElementById('dashboardCustomizeBtn')?.addEventListener('click', () => setEditMode(true));
    document.getElementById('dashboardDoneBtn')?.addEventListener('click', () => setEditMode(false));
    document.getElementById('dashboardResetBtn')?.addEventListener('click', resetLayout);

    refreshData();
    setInterval(() => refreshData().catch(() => {}), 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
