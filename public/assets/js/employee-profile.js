/**
 * HR Admin — Employee Full Profile
 */
(function () {
  'use strict';

  const TABS = [
    { id: 'profile', label: 'Profile', icon: 'fa-user' },
    { id: 'job', label: 'Job Details', icon: 'fa-briefcase' },
    { id: 'salary', label: 'Salary', icon: 'fa-indian-rupee-sign' },
    { id: 'bank', label: 'Bank Details', icon: 'fa-building-columns' },
    { id: 'statutory', label: 'Statutory', icon: 'fa-file-contract' },
    { id: 'documents', label: 'Documents', icon: 'fa-folder-open' },
    { id: 'attendance', label: 'Attendance', icon: 'fa-clock' },
    { id: 'leave', label: 'Leave', icon: 'fa-calendar-days' },
    { id: 'payroll', label: 'Payroll', icon: 'fa-money-check-dollar' },
    { id: 'assets', label: 'Assets', icon: 'fa-laptop' },
    { id: 'performance', label: 'Performance', icon: 'fa-chart-line' },
    { id: 'timeline', label: 'Timeline', icon: 'fa-clock-rotate-left' },
    { id: 'exit', label: 'Exit', icon: 'fa-door-open' },
  ];

  const page = document.getElementById('employeeProfilePage');
  if (!page) return;

  const employeeId = page.dataset.employeeId;
  let profileData = null;
  let profilePermissions = null;
  let activeTab = getTabFromUrl();
  const tabCache = {};
  const tabState = {
    attendance: { month: currentMonthValue() },
    leave: { year: String(new Date().getFullYear()) },
  };

  function currentMonthValue() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function getTabCacheKey(tab) {
    if (tab === 'attendance' && tabState.attendance?.month) return `attendance:${tabState.attendance.month}`;
    if (tab === 'leave' && tabState.leave?.year) return `leave:${tabState.leave.year}`;
    return tab;
  }

  function getVisibleTabs() {
    const allowed = profilePermissions?.visibleTabs;
    if (!allowed?.length) return TABS;
    return TABS.filter((t) => allowed.includes(t.id));
  }

  function getTabFromUrl() {
    const tab = new URLSearchParams(window.location.search).get('tab');
    const visible = getVisibleTabs();
    if (tab && visible.some((t) => t.id === tab)) return tab;
    return visible[0]?.id || 'profile';
  }

  function setTabInUrl(tab) {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showError(msg) {
    document.getElementById('epLoading')?.classList.add('d-none');
    const el = document.getElementById('epError');
    if (el) {
      el.textContent = msg;
      el.classList.remove('d-none');
    }
  }

  function dlGrid(rows) {
    return `
      <dl class="ep-dl-grid">
        ${rows
          .map(
            ([label, value]) => `
          <div class="ep-dl-item">
            <dt>${escapeHtml(label)}</dt>
            <dd>${escapeHtml(value || '—')}</dd>
          </div>
        `
          )
          .join('')}
      </dl>
    `;
  }

  function renderHero(hero) {
    const initial = hero.name ? hero.name.charAt(0).toUpperCase() : 'E';
    const photo = hero.profilePhoto
      ? `<img src="${escapeHtml(hero.profilePhoto)}" alt="">`
      : `<span style="font-size:1.5rem;font-weight:800;color:#6366f1">${escapeHtml(initial)}</span>`;

    return `
      <div class="cp-hero-inner">
        <div class="cp-logo-wrap">${photo}</div>
        <div class="cp-hero-meta">
          <div class="cp-hero-title">${escapeHtml(hero.name)}</div>
          <div class="cp-hero-sub text-muted">${escapeHtml(hero.empId)} · ${escapeHtml(hero.designation || 'No designation')}</div>
          <div class="mt-2 d-flex flex-wrap gap-2">
            <span class="ep-badge-lifecycle">${escapeHtml(hero.lifecycleLabel)}</span>
            <span class="ep-badge-lifecycle ${hero.isActive ? 'ep-badge-active' : 'ep-badge-inactive'}">${hero.isActive ? 'Active' : 'Inactive'}</span>
            ${hero.department ? `<span class="cp-chip">${escapeHtml(hero.department)}</span>` : ''}
            ${hero.employeeType ? `<span class="cp-chip">${escapeHtml(hero.employeeType)}</span>` : ''}
          </div>
          <div class="ep-hero-actions">
            <a href="/employees?edit=${hero.id}" class="btn btn-outline-primary btn-sm"><i class="fas fa-pen me-1"></i> Edit</a>
            <a href="/documents?employeeId=${hero.id}" class="btn btn-outline-secondary btn-sm"><i class="fas fa-file-lines me-1"></i> Documents</a>
            <a href="/onboarding-workflow/${hero.id}" class="btn btn-outline-secondary btn-sm"><i class="fas fa-route me-1"></i> Onboarding</a>
            <a href="/exit-workflow/${hero.id}" class="btn btn-outline-warning btn-sm"><i class="fas fa-door-open me-1"></i> Exit</a>
          </div>
        </div>
      </div>
    `;
  }

  function renderStepper(checklist) {
    const summary = checklist?.summary;
    const steps = checklist?.steps || [];

    document.getElementById('epStepperSummary').textContent = summary
      ? `${summary.done} of ${summary.total} steps complete (${summary.percent}%)`
      : '';

    const nextBtn = document.getElementById('epNextActionBtn');
    if (nextBtn && summary?.nextStep?.action) {
      nextBtn.href = summary.nextStep.action.href;
      nextBtn.innerHTML = `${escapeHtml(summary.nextStep.action.label)} <i class="fas fa-arrow-right ms-1"></i>`;
      nextBtn.classList.remove('d-none');
    } else if (nextBtn) {
      nextBtn.classList.add('d-none');
    }

    document.getElementById('epStepper').innerHTML = steps
      .map(
        (s) => `
      <div class="ep-step ${escapeHtml(s.status)}" title="${escapeHtml(s.blocker || s.label)}">
        <div class="ep-step-dot"></div>
        <div class="ep-step-label">${escapeHtml(s.label)}</div>
      </div>
    `
      )
      .join('');
  }

  function renderTabsNav(tabFlags) {
    const visibleTabs = getVisibleTabs();
    document.getElementById('epTabsNav').innerHTML = visibleTabs.map((t) => {
      const flag = tabFlags?.[t.id] || 'good';
      return `
        <button type="button" class="ep-tab-btn ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}">
          <span class="ep-tab-flag ${flag}"></span>
          <i class="fas ${t.icon}"></i>
          ${escapeHtml(t.label)}
        </button>
      `;
    }).join('');

    document.querySelectorAll('.ep-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        setTabInUrl(activeTab);
        document.querySelectorAll('.ep-tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === activeTab));
        loadTab(activeTab);
      });
    });
  }

  function readOnlyNote() {
    return '<p class="text-muted small mb-2"><i class="fas fa-lock me-1"></i>View only — you do not have permission to edit this section.</p>';
  }

  function canEditFinancial() {
    return profilePermissions?.canEditFinancial !== false;
  }

  function canEditJob() {
    return profilePermissions?.canEditJob !== false;
  }

  function canEditAssets() {
    return profilePermissions?.canEditAssets !== false;
  }

  function formField(label, name, value, type = 'text', options = {}) {
    const extra = options.required ? ' required' : '';
    if (type === 'select') {
      const opts = (options.choices || []).map(
        (c) => `<option value="${escapeHtml(c)}" ${value === c ? 'selected' : ''}>${escapeHtml(c)}</option>`
      ).join('');
      return `
        <div class="ep-form-group">
          <label class="ep-form-label" for="ep-${name}">${escapeHtml(label)}</label>
          <select class="form-control form-control-sm" id="ep-${name}" name="${name}">${opts}</select>
        </div>`;
    }
    return `
      <div class="ep-form-group">
        <label class="ep-form-label" for="ep-${name}">${escapeHtml(label)}</label>
        <input class="form-control form-control-sm" type="${type}" id="ep-${name}" name="${name}" value="${escapeHtml(value ?? '')}"${extra} />
      </div>`;
  }

  function formAlert(id) {
    return `<div id="${id}" class="alert d-none ep-form-alert" role="alert"></div>`;
  }

  function invalidateTabCache(...tabs) {
    if (!tabs.length) {
      Object.keys(tabCache).forEach((k) => { delete tabCache[k]; });
      return;
    }
    tabs.forEach((t) => {
      Object.keys(tabCache).forEach((k) => {
        if (k === t || k.startsWith(`${t}:`)) delete tabCache[k];
      });
    });
  }

  function formatCurrency(val) {
    const n = Number(val);
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  }

  function formatTime(val) {
    if (!val) return '—';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateShort(val) {
    if (!val) return '—';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatWorkHours(minutes) {
    const m = Number(minutes) || 0;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return `${h}h ${rem}m`;
  }

  function statusBadge(status) {
    const map = {
      PRESENT: 'success',
      LATE: 'warning',
      ABSENT: 'danger',
      LEAVE: 'info',
      HALF_DAY: 'secondary',
      HOLIDAY: 'primary',
      WEEKOFF: 'light',
      NOT_MARKED: 'muted',
      APPROVED: 'success',
      PENDING: 'warning',
      REJECTED: 'danger',
      CANCELED: 'secondary',
      Published: 'success',
      Held: 'warning',
      Resolved: 'success',
      Closed: 'secondary',
      'In Progress': 'info',
    };
    const cls = map[status] || 'secondary';
    const label = String(status || '—').replace(/_/g, ' ');
    return `<span class="ep-status-badge ep-status-${cls}">${escapeHtml(label)}</span>`;
  }

  function statCards(items) {
    return `<div class="ep-stat-grid">${items.map(([label, value]) => `
      <div class="ep-stat-card">
        <div class="ep-stat-value">${escapeHtml(value ?? '0')}</div>
        <div class="ep-stat-label">${escapeHtml(label)}</div>
      </div>`).join('')}</div>`;
  }

  function dataTable(headers, rows, emptyMsg = 'No records') {
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) return `<p class="text-muted small mb-0">${escapeHtml(emptyMsg)}</p>`;
    return `
      <div class="ep-table-wrap">
        <table class="ep-data-table">
          <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
          <tbody>${list.join('')}</tbody>
        </table>
      </div>`;
  }

  async function refreshProfileFlags() {
    try {
      const res = await apiCall(`/employees/${employeeId}/profile`);
      profileData = res?.data ?? res;
      renderStepper(profileData.checklist);
      renderTabsNav(profileData.tabFlags);
    } catch (_) { /* ignore */ }
  }

  function showFormAlert(el, type, msg) {
    if (!el) return;
    el.className = `alert alert-${type} ep-form-alert`;
    el.textContent = msg;
    el.classList.remove('d-none');
  }

  function panel(title, body) {
    return `<div class="ep-panel"><div class="ep-panel-title">${escapeHtml(title)}</div>${body}</div>`;
  }

  function formatJobChangeSummary(item) {
    const after = item.after || {};
    const parts = [];
    if (after.empDesignation) parts.push(`Designation → ${after.empDesignation}`);
    if (after.empDepartment) parts.push(`Dept → ${after.empDepartment}`);
    if (after.division) parts.push(`Division → ${after.division}`);
    if (after.gradeBandLevel) parts.push(`Grade → ${after.gradeBandLevel}`);
    if (after.empWorkLoc) parts.push(`Location → ${after.empWorkLoc}`);
    if (after.workMode) parts.push(`Mode → ${after.workMode}`);
    return parts.join(' · ') || '—';
  }

  function initWorkflowForms() {
    const panelEl = document.getElementById('epTabPanel');
    if (!panelEl || panelEl.dataset.formsBound) return;
    panelEl.dataset.formsBound = '1';

    panelEl.addEventListener('submit', async (e) => {
      const form = e.target;
      if (form.id === 'epBankForm') {
        e.preventDefault();
        const alertEl = document.getElementById('epBankAlert');
        const btn = form.querySelector('button[type="submit"]');
        const body = Object.fromEntries(new FormData(form).entries());
        btn.disabled = true;
        try {
          await apiCall(`/employees/${employeeId}/bank-details`, { method: 'PUT', body: JSON.stringify(body) });
          showFormAlert(alertEl, 'success', 'Bank details saved.');
          invalidateTabCache('bank', 'statutory');
          await refreshProfileFlags();
        } catch (err) {
          showFormAlert(alertEl, 'danger', err.message || 'Save failed');
        } finally {
          btn.disabled = false;
        }
      } else if (form.id === 'epStatutoryForm') {
        e.preventDefault();
        const alertEl = document.getElementById('epStatutoryAlert');
        const btn = form.querySelector('button[type="submit"]');
        const body = Object.fromEntries(new FormData(form).entries());
        btn.disabled = true;
        try {
          await apiCall(`/employees/${employeeId}/bank-details`, { method: 'PUT', body: JSON.stringify(body) });
          showFormAlert(alertEl, 'success', 'Statutory details saved.');
          invalidateTabCache('bank', 'statutory');
          await refreshProfileFlags();
        } catch (err) {
          showFormAlert(alertEl, 'danger', err.message || 'Save failed');
        } finally {
          btn.disabled = false;
        }
      } else if (form.id === 'epSalaryForm') {
        e.preventDefault();
        const alertEl = document.getElementById('epSalaryAlert');
        const btn = form.querySelector('button[type="submit"]');
        const fd = new FormData(form);
        btn.disabled = true;
        try {
          await apiCall(`/employees/${employeeId}/profile/salary`, {
            method: 'PUT',
            body: JSON.stringify({
              empCtc: fd.get('empCtc'),
              syncPayroll: fd.get('syncPayroll') === 'on',
            }),
          });
          showFormAlert(alertEl, 'success', 'Salary updated.');
          invalidateTabCache('salary');
          await refreshProfileFlags();
          await loadTab('salary', true);
        } catch (err) {
          showFormAlert(alertEl, 'danger', err.message || 'Update failed');
        } finally {
          btn.disabled = false;
        }
      } else if (form.id === 'epJobChangeForm') {
        e.preventDefault();
        const alertEl = document.getElementById('epJobChangeAlert');
        const btn = form.querySelector('button[type="submit"]');
        const body = Object.fromEntries(new FormData(form).entries());
        btn.disabled = true;
        try {
          await apiCall(`/employees/${employeeId}/job-change`, { method: 'POST', body: JSON.stringify(body) });
          showFormAlert(alertEl, 'success', 'Job change recorded.');
          invalidateTabCache('job', 'timeline');
          await refreshProfileFlags();
          await loadTab('job', true);
        } catch (err) {
          showFormAlert(alertEl, 'danger', err.message || 'Save failed');
        } finally {
          btn.disabled = false;
        }
      } else if (form.id === 'epAssetForm') {
        e.preventDefault();
        const alertEl = document.getElementById('epAssetAlert');
        const btn = form.querySelector('button[type="submit"]');
        const body = Object.fromEntries(new FormData(form).entries());
        btn.disabled = true;
        try {
          await apiCall(`/employees/${employeeId}/assets`, { method: 'POST', body: JSON.stringify(body) });
          showFormAlert(alertEl, 'success', 'Asset assigned.');
          invalidateTabCache('assets');
          await loadTab('assets', true);
        } catch (err) {
          showFormAlert(alertEl, 'danger', err.message || 'Assign failed');
        } finally {
          btn.disabled = false;
        }
      }
    });

    panelEl.addEventListener('click', async (e) => {
      const returnBtn = e.target.closest('.ep-return-asset-btn');
      if (returnBtn) {
        const assetId = returnBtn.dataset.assetId;
        if (!assetId || !confirm('Mark this asset as returned?')) return;
        const alertEl = document.getElementById('epAssetAlert');
        returnBtn.disabled = true;
        try {
          await apiCall(`/employees/${employeeId}/assets/${assetId}/return`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'Returned' }),
          });
          showFormAlert(alertEl, 'success', 'Asset marked as returned.');
          invalidateTabCache('assets');
          await loadTab('assets', true);
        } catch (err) {
          showFormAlert(alertEl, 'danger', err.message || 'Update failed');
          returnBtn.disabled = false;
        }
        return;
      }

      if (e.target.id !== 'epSyncPayrollBtn') return;
      const alertEl = document.getElementById('epSalaryAlert');
      const syncBtn = e.target;
      syncBtn.disabled = true;
      try {
        await apiCall(`/employees/${employeeId}/profile/salary`, {
          method: 'PUT',
          body: JSON.stringify({ syncPayroll: true }),
        });
        showFormAlert(alertEl, 'success', 'Payroll structure synced from employee CTC.');
        invalidateTabCache('salary');
        await refreshProfileFlags();
        await loadTab('salary', true);
      } catch (err) {
        showFormAlert(alertEl, 'danger', err.message || 'Sync failed');
      } finally {
        syncBtn.disabled = false;
      }
    });
  }

  function initOpsTabControls() {
    const panelEl = document.getElementById('epTabPanel');
    if (!panelEl || panelEl.dataset.opsBound) return;
    panelEl.dataset.opsBound = '1';

    panelEl.addEventListener('change', async (e) => {
      if (e.target.id === 'epAttendanceMonth') {
        tabState.attendance = { month: e.target.value };
        invalidateTabCache('attendance');
        await loadTab('attendance', true);
      } else if (e.target.id === 'epLeaveYear') {
        tabState.leave = { year: e.target.value };
        invalidateTabCache('leave');
        await loadTab('leave', true);
      }
    });
  }

  function renderTabContent(tab, data) {
    switch (tab) {
      case 'profile': {
        const p = data.personal || {};
        const e = data.emergency || {};
        return (
          panel('Personal information', dlGrid([
            ['Full name', p.fullName],
            ['Date of birth', p.dob],
            ['Gender', p.gender],
            ['Marital status', p.maritalStatus],
            ['Blood group', p.bloodGroup],
            ['Nationality', p.nationality],
            ['Email', p.email],
            ['Phone', p.phone],
            ['Alt phone', p.altPhone],
            ['Present address', p.presentAddress],
            ['Permanent address', p.permanentAddress],
          ]))
          + panel('Emergency contact', dlGrid([
            ['Name', e.name],
            ['Relation', e.relation],
            ['Phone', e.phone],
          ]))
        );
      }
      case 'job': {
        const m = data.manager;
        const fd = data.formDefaults || {};
        const history = data.jobChangeHistory || [];
        const histRows = history.map((h) => `
          <tr>
            <td>${escapeHtml(String(h.changeType || h.action || '').replace(/_/g, ' '))}</td>
            <td>${escapeHtml(formatDateShort(h.effectiveDate || h.createdAt))}</td>
            <td class="small">${escapeHtml(formatJobChangeSummary(h))}</td>
            <td class="text-muted small">${escapeHtml(h.reason || '—')}</td>
          </tr>`);
        return panel('Job details', `
          ${dlGrid([
            ['Employee type', data.employeeType],
            ['Department', data.department],
            ['Designation', data.designation],
            ['Division', data.division],
            ['Grade', data.grade],
            ['Manager', m ? `${m.empName} (${m.empId})` : null],
            ['Work location', data.workLocation],
            ['Work mode', data.workMode],
            ['Date of joining', data.dateOfJoining],
            ['Probation (months)', data.probationMonths],
            ['Confirmation date', data.confirmationDate],
            ['Lifecycle stage', data.lifecycleStage],
            ['Employment status', data.employmentStatus],
          ])}
          <h6 class="ep-section-title mt-3">Record promotion / transfer</h6>
          ${formAlert('epJobChangeAlert')}
          ${canEditJob() ? `
          <form id="epJobChangeForm" class="ep-form-grid">
            ${formField('Change type', 'changeType', 'transfer', 'select', {
              choices: ['promotion', 'transfer', 'department_change', 'designation_change'],
            })}
            ${formField('Effective date', 'effectiveDate', new Date().toISOString().split('T')[0], 'date', { required: true })}
            ${formField('Designation', 'empDesignation', fd.empDesignation)}
            ${formField('Department', 'empDepartment', fd.empDepartment)}
            ${formField('Division', 'division', fd.division)}
            ${formField('Sub-department', 'subDepartment', fd.subDepartment)}
            ${formField('Grade / band', 'gradeBandLevel', fd.gradeBandLevel)}
            ${formField('Work location', 'empWorkLoc', fd.empWorkLoc)}
            ${formField('Work mode', 'workMode', fd.workMode || 'On-site', 'select', {
              choices: ['On-site', 'Hybrid', 'Remote'],
            })}
            ${formField('Manager employee ID', 'reportingManagerId', fd.reportingManagerId || '', 'number')}
            <div class="ep-form-group" style="grid-column:1/-1">
              <label class="ep-form-label" for="ep-job-reason">Reason / notes</label>
              <textarea class="form-control form-control-sm" id="ep-job-reason" name="reason" rows="2"></textarea>
            </div>
            <div class="ep-form-actions">
              <button type="submit" class="btn btn-primary btn-sm">Save job change</button>
            </div>
          </form>` : readOnlyNote()}
          <h6 class="ep-section-title mt-3">Change history</h6>
          ${dataTable(['Type', 'Effective', 'Changes', 'Reason'], histRows, 'No promotions or transfers recorded yet')}
        `);
      }
      case 'documents': {
        const up = data.uploaded || [];
        const gen = data.generated || [];
        const upHtml = up.length
          ? up.map((d) => `<div class="ep-doc-row"><span>${escapeHtml(d.documentType)}</span><span class="text-muted">${escapeHtml(d.verificationStatus)}</span></div>`).join('')
          : '<p class="text-muted mb-0">No uploaded documents</p>';
        const genHtml = gen.length
          ? gen.map((d) => `<div class="ep-doc-row"><span>${escapeHtml(d.code || 'Document')}</span><span class="text-muted">v${escapeHtml(d.version)}</span></div>`).join('')
          : '<p class="text-muted mb-0">No generated documents</p>';
        return panel('Documents', `
          <h6 class="fw-bold mb-2">Uploaded</h6>${upHtml}
          <h6 class="fw-bold mt-3 mb-2">Generated</h6>${genHtml}
          <a href="/documents?employeeId=${employeeId}" class="btn btn-sm btn-outline-primary mt-3">Manage documents</a>
        `);
      }
      case 'timeline': {
        const items = data.items || [];
        if (!items.length) {
          return panel('Timeline', '<div class="ep-empty"><i class="fas fa-clock-rotate-left d-block"></i><p>No timeline events yet</p></div>');
        }
        return panel('Timeline', items.map((i) => `
          <div class="ep-timeline-item ${i.type === 'audit' ? 'ep-timeline-audit' : ''}">
            <div class="ep-timeline-icon"><i class="fas ${escapeHtml(i.icon || 'fa-circle')}"></i></div>
            <div>
              <div class="fw-bold">${escapeHtml(i.title)}</div>
              <div class="text-muted small">${escapeHtml(i.subtitle)}</div>
            </div>
          </div>
        `).join(''));
      }
      case 'exit': {
        const cl = data.checklist || [];
        const prog = data.checklistProgress || {};
        const clHtml = cl.map((c) => `
          <div class="ep-checklist-row ${c.done ? 'done' : ''}">
            <i class="fas ${c.done ? 'fa-check-circle' : 'fa-circle'}"></i>
            <span>${escapeHtml(c.label)}</span>
            <span class="text-muted ms-auto small">${escapeHtml(c.department)}</span>
          </div>
        `).join('');
        return panel('Exit & offboarding', dlGrid([
          ['Resignation date', data.resignationDate],
          ['Last working day', data.lastWorkingDay],
          ['Notice period (days)', data.noticePeriodDays],
          ['Lifecycle stage', data.lifecycleStage],
          ['Clearance', `${prog.done || 0} / ${prog.total || 0} (${prog.percent || 0}%)`],
        ]) + `<div class="mt-3">${clHtml}</div>
          <a href="/exit-workflow/${employeeId}" class="btn btn-sm btn-warning mt-3">Open exit workflow</a>`);
      }
      case 'salary': {
        const structures = data.structures || [];
        const assignments = data.assignments || [];
        const structHtml = structures.length
          ? structures.map((s) => `<div class="ep-doc-row"><span>CTC ${escapeHtml(s.ctc)}</span><span class="text-muted">from ${escapeHtml(s.effectiveDate)} ${s.isActive ? '· Active' : ''}</span></div>`).join('')
          : '<p class="text-muted small mb-0">No employee salary structure records</p>';
        const assignHtml = assignments.length
          ? assignments.map((a) => `<div class="ep-doc-row"><span>${escapeHtml(a.salaryStructure?.name || 'Structure')}</span><span class="text-muted">${escapeHtml(a.effectiveFrom)}${a.effectiveTo ? ' – ' + escapeHtml(a.effectiveTo) : ''}</span></div>`).join('')
          : '<p class="text-muted small mb-0">No org structure assignments</p>';
        return panel('Salary & compensation', `
          ${formAlert('epSalaryAlert')}
          ${canEditFinancial() ? `
          <form id="epSalaryForm" class="ep-form-grid mb-3">
            ${formField('Annual CTC (₹)', 'empCtc', data.empCtc, 'number', { required: true })}
            <div class="ep-form-group ep-form-check">
              <label class="ep-form-check">
                <input type="checkbox" name="syncPayroll" class="form-check-input" />
                Sync payroll structure after save
              </label>
            </div>
            <div class="ep-form-actions">
              <button type="submit" class="btn btn-primary btn-sm">Save CTC</button>
              <button type="button" class="btn btn-outline-primary btn-sm" id="epSyncPayrollBtn">Sync structure only</button>
            </div>
          </form>` : readOnlyNote()}
          ${dlGrid([
            ['Active structure', data.payrollLink?.hasSalaryStructure ? 'Yes' : 'No'],
            ['CTC aligned', data.payrollLink?.ctcAligned === true ? 'Yes' : (data.payrollLink?.ctcAligned === false ? 'No' : '—')],
            ['Last payroll', data.payrollLink?.lastPayrollRun?.periodLabel || '—'],
          ])}
          <h6 class="fw-bold mt-3 mb-2">Structure history</h6>${structHtml}
          <h6 class="fw-bold mt-3 mb-2">Org assignments</h6>${assignHtml}
          <a href="/admin/payroll/structures" class="btn btn-sm btn-outline-secondary mt-3">Manage payroll structures</a>
        `);
      }
      case 'bank': {
        const b = data.bank || {};
        return panel('Bank details', `
          ${formAlert('epBankAlert')}
          ${canEditFinancial() ? `
          <form id="epBankForm" class="ep-form-grid">
            ${formField('Bank name', 'bankName', b.bankName)}
            ${formField('Account holder name', 'accountHolderName', b.accountHolderName)}
            ${formField('Account number', 'accountNumber', b.accountNumber)}
            ${formField('IFSC code', 'ifscCode', b.ifscCode)}
            ${formField('Branch name', 'branchName', b.branchName)}
            <div class="ep-form-actions">
              <button type="submit" class="btn btn-primary btn-sm">Save bank details</button>
            </div>
          </form>` : readOnlyNote() + dlGrid([
            ['Bank name', b.bankName],
            ['Account holder', b.accountHolderName],
            ['Account number', b.accountNumber],
            ['IFSC', b.ifscCode],
            ['Branch', b.branchName],
          ])}
        `);
      }
      case 'statutory':
        return panel('Statutory details', `
          ${formAlert('epStatutoryAlert')}
          ${canEditFinancial() ? `
          <form id="epStatutoryForm" class="ep-form-grid">
            ${formField('PAN', 'panNumber', data.panNumber)}
            ${formField('UAN', 'uanNumber', data.uanNumber)}
            ${formField('ESI number', 'esiNumber', data.esiNumber)}
            ${formField('Aadhaar', 'aadhaarNumber', data.aadhaarNumber)}
            ${formField('Tax declaration', 'taxDeclarationStatus', data.taxDeclarationStatus || 'Not Submitted', 'select', {
              choices: ['Not Submitted', 'Submitted', 'Verified'],
            })}
            <div class="ep-form-actions">
              <button type="submit" class="btn btn-primary btn-sm">Save statutory details</button>
            </div>
          </form>` : readOnlyNote() + dlGrid([
            ['PAN', data.panNumber],
            ['UAN', data.uanNumber],
            ['ESI number', data.esiNumber],
            ['Aadhaar', data.aadhaarNumber],
            ['Tax declaration', data.taxDeclarationStatus],
          ])}
        `);
      case 'attendance': {
        const stats = data.stats || {};
        const shift = data.shift?.shift;
        const shiftLabel = shift
          ? `${shift.name} (${shift.startTime || '—'} – ${shift.endTime || '—'})`
          : 'Not assigned';
        const dayRows = (data.days || []).map((d) => `
          <tr>
            <td>${escapeHtml(formatDateShort(d.date))}</td>
            <td>${statusBadge(d.status)}</td>
            <td>${escapeHtml(formatTime(d.firstInAt))}</td>
            <td>${escapeHtml(formatTime(d.lastOutAt))}</td>
            <td>${escapeHtml(formatWorkHours(d.workMinutes))}</td>
            <td>${d.lateMinutes > 0 ? escapeHtml(`${d.lateMinutes}m`) : '—'}</td>
          </tr>`);
        const regRows = (data.regularizations || []).map((r) => `
          <tr>
            <td>${escapeHtml(formatDateShort(r.date))}</td>
            <td>${escapeHtml(r.type?.replace(/_/g, ' ') || '—')}</td>
            <td>${statusBadge(r.status)}</td>
            <td class="text-muted small">${escapeHtml(r.reason || '—')}</td>
          </tr>`);
        return panel('Attendance', `
          <div class="ep-ops-toolbar">
            <label class="ep-month-picker">
              <span>Period</span>
              <input type="month" class="form-control form-control-sm" id="epAttendanceMonth" value="${escapeHtml(data.period || tabState.attendance.month)}" />
            </label>
            ${data.monthLocked ? '<span class="ep-lock-badge"><i class="fas fa-lock"></i> Month locked</span>' : ''}
          </div>
          ${statCards([
            ['Present', stats.present ?? 0],
            ['Absent', stats.absent ?? 0],
            ['Late', stats.late ?? 0],
            ['On leave', stats.leave ?? 0],
            ['Half day', stats.halfDay ?? 0],
            ['Rate', stats.attendanceRate != null ? `${stats.attendanceRate}%` : '—'],
          ])}
          ${dlGrid([
            ['Shift', shiftLabel],
            ['Work hours', formatWorkHours(stats.totalWorkMinutes)],
            ['Recorded days', stats.recordedDays ?? 0],
          ])}
          <h6 class="ep-section-title">Daily log</h6>
          ${dataTable(['Date', 'Status', 'In', 'Out', 'Work', 'Late'], dayRows, 'No attendance records for this period')}
          <h6 class="ep-section-title mt-3">Regularization requests</h6>
          ${dataTable(['Date', 'Type', 'Status', 'Reason'], regRows, 'No regularization requests')}
          <div class="ep-form-actions mt-3">
            <a href="/admin/attendance/summaries" class="btn btn-sm btn-outline-primary">Employee summaries</a>
            <a href="/admin/attendance/regularizations" class="btn btn-sm btn-outline-secondary">Regularizations</a>
          </div>
        `);
      }
      case 'leave': {
        const bal = data.balances || [];
        const reqs = data.requests || [];
        const stats = data.requestStats || {};
        const balRows = bal.map((b) => `
          <tr>
            <td>${escapeHtml(b.leaveType?.name || 'Leave')}</td>
            <td>${escapeHtml(b.allocated)}</td>
            <td>${escapeHtml(b.used)}</td>
            <td>${escapeHtml(b.pending)}</td>
            <td><strong>${escapeHtml(b.available)}</strong></td>
          </tr>`);
        const reqRows = reqs.map((r) => `
          <tr>
            <td>${escapeHtml(r.leaveType?.name || 'Leave')}</td>
            <td>${escapeHtml(formatDateShort(r.startDate))} – ${escapeHtml(formatDateShort(r.endDate))}</td>
            <td>${escapeHtml(r.totalDays)}</td>
            <td>${statusBadge(r.status)}</td>
            <td class="text-muted small">${escapeHtml(r.reason || '—')}</td>
          </tr>`);
        return panel('Leave', `
          <div class="ep-ops-toolbar">
            <label class="ep-month-picker">
              <span>Balance year</span>
              <input type="number" class="form-control form-control-sm" id="epLeaveYear" min="2020" max="2099" value="${escapeHtml(data.year || tabState.leave.year)}" />
            </label>
          </div>
          ${statCards([
            ['Pending', stats.pending ?? 0],
            ['Approved', stats.approved ?? 0],
            ['Rejected', stats.rejected ?? 0],
          ])}
          <h6 class="ep-section-title">Balances (${escapeHtml(data.year)})</h6>
          ${dataTable(['Type', 'Allocated', 'Used', 'Pending', 'Available'], balRows, 'No leave balances for this year')}
          <h6 class="ep-section-title mt-3">Recent requests</h6>
          ${dataTable(['Type', 'Dates', 'Days', 'Status', 'Reason'], reqRows, 'No leave requests')}
          <a href="/leave-requests" class="btn btn-sm btn-outline-primary mt-3">Open leave requests</a>
        `);
      }
      case 'payroll': {
        const payslips = data.payslips || [];
        const queries = data.queries || [];
        const link = data.payrollLink || {};
        const slipRows = payslips.map((p) => `
          <tr>
            <td>${escapeHtml(p.periodLabel)}</td>
            <td><strong>${escapeHtml(formatCurrency(p.netPay))}</strong></td>
            <td>${statusBadge(p.status)}</td>
            <td>${escapeHtml(formatDateShort(p.processedDate))}</td>
            <td>${p.pdfUrl ? `<a href="${escapeHtml(p.pdfUrl)}" target="_blank" rel="noopener" class="btn btn-xs btn-outline-secondary btn-sm">PDF</a>` : '—'}</td>
          </tr>`);
        const queryRows = queries.map((q) => `
          <tr>
            <td>${escapeHtml(q.category)}</td>
            <td>${escapeHtml(q.subject)}</td>
            <td>${statusBadge(q.status)}</td>
            <td>${escapeHtml(formatDateShort(q.createdAt))}</td>
          </tr>`);
        return panel('Payroll', `
          ${statCards([
            ['YTD net pay', formatCurrency(data.ytdNetPay)],
            ['Payslips', payslips.length],
            ['Open queries', queries.filter((q) => q.status === 'Pending' || q.status === 'In Progress').length],
            ['CTC aligned', link.ctcAligned === true ? 'Yes' : (link.ctcAligned === false ? 'No' : '—')],
          ])}
          ${dlGrid([
            ['Active structure', link.hasSalaryStructure ? 'Yes' : 'No'],
            ['Last payroll run', link.lastPayrollRun?.periodLabel || '—'],
          ])}
          <h6 class="ep-section-title">Payslip history</h6>
          ${dataTable(['Period', 'Net pay', 'Status', 'Processed', ''], slipRows, 'No payslips generated yet')}
          <h6 class="ep-section-title mt-3">Payroll queries</h6>
          ${dataTable(['Category', 'Subject', 'Status', 'Raised'], queryRows, 'No payroll queries')}
          <div class="ep-form-actions mt-3">
            <a href="/admin/payroll/payslips" class="btn btn-sm btn-outline-primary">All payslips</a>
            <a href="/admin/payroll/queries" class="btn btn-sm btn-outline-secondary">Query inbox</a>
            <a href="/admin/payroll/runs" class="btn btn-sm btn-outline-secondary">Payroll runs</a>
          </div>
        `);
      }
      case 'assets': {
        const assets = data.assets || [];
        const summary = data.summary || {};
        const types = data.assetTypes || ['Laptop', 'Mobile', 'Access Card', 'Monitor', 'Headset', 'Other'];
        const assetRows = assets.map((a) => `
          <tr>
            <td>${escapeHtml(a.assetType)}</td>
            <td><strong>${escapeHtml(a.assetName)}</strong>${a.assetTag ? `<div class="text-muted small">${escapeHtml(a.assetTag)}</div>` : ''}</td>
            <td>${escapeHtml([a.brand, a.model].filter(Boolean).join(' ') || '—')}</td>
            <td>${escapeHtml(formatDateShort(a.assignedDate))}</td>
            <td>${statusBadge(a.status)}</td>
            <td>
              ${a.status === 'Assigned' && canEditAssets()
                ? `<button type="button" class="btn btn-sm btn-outline-success ep-return-asset-btn" data-asset-id="${escapeHtml(a.id)}">Mark returned</button>`
                : escapeHtml(formatDateShort(a.returnedDate) || (a.status === 'Assigned' ? '—' : '—'))}
            </td>
          </tr>`);
        const itNote = data.itAssetsChecklist
          ? `<p class="small text-muted mb-2">Offboarding IT clearance: ${data.itAssetsChecklist.done ? 'Returned' : 'Pending'}</p>`
          : '';
        return panel('Asset register', `
          ${itNote}
          ${statCards([
            ['Total assets', summary.total ?? 0],
            ['Assigned', summary.assigned ?? 0],
            ['Returned', summary.returned ?? 0],
          ])}
          <h6 class="ep-section-title">Assign asset</h6>
          ${formAlert('epAssetAlert')}
          ${canEditAssets() ? `
          <form id="epAssetForm" class="ep-form-grid mb-3">
            ${formField('Asset type', 'assetType', 'Laptop', 'select', { choices: types })}
            ${formField('Asset name', 'assetName', '', 'text', { required: true })}
            ${formField('Asset tag / serial', 'assetTag', '')}
            ${formField('Brand', 'brand', '')}
            ${formField('Model', 'model', '')}
            ${formField('Assigned date', 'assignedDate', new Date().toISOString().split('T')[0], 'date', { required: true })}
            <div class="ep-form-group" style="grid-column:1/-1">
              <label class="ep-form-label" for="ep-asset-notes">Notes</label>
              <textarea class="form-control form-control-sm" id="ep-asset-notes" name="notes" rows="2"></textarea>
            </div>
            <div class="ep-form-actions">
              <button type="submit" class="btn btn-primary btn-sm">Assign asset</button>
            </div>
          </form>` : readOnlyNote()}
          <h6 class="ep-section-title">Assigned assets</h6>
          ${dataTable(['Type', 'Name', 'Brand/Model', 'Assigned', 'Status', 'Action'], assetRows, 'No assets assigned yet')}
        `);
      }
      case 'performance':
        return panel('Performance', `<div class="ep-empty"><i class="fas fa-chart-line d-block"></i><p>${escapeHtml(data.message || 'Coming soon')}</p></div>`);
      default:
        return panel('Section', '<p class="text-muted">No data</p>');
    }
  }

  async function loadTab(tab, forceReload = false) {
    const panelEl = document.getElementById('epTabPanel');
    panelEl.innerHTML = '<div class="ep-loading"><div class="spinner-border spinner-border-sm text-primary"></div></div>';

    const cacheKey = getTabCacheKey(tab);

    try {
      if (forceReload || !tabCache[cacheKey]) {
        const qs = new URLSearchParams();
        if (tab === 'attendance' && tabState.attendance?.month) qs.set('month', tabState.attendance.month);
        if (tab === 'leave' && tabState.leave?.year) qs.set('year', tabState.leave.year);
        const query = qs.toString();
        const url = `/employees/${employeeId}/profile/tab/${tab}${query ? `?${query}` : ''}`;
        const res = await apiCall(url);
        tabCache[cacheKey] = res?.data ?? res;
      }
      const payload = tabCache[cacheKey];
      panelEl.innerHTML = renderTabContent(tab, payload.data || payload);
    } catch (err) {
      panelEl.innerHTML = `<div class="alert alert-warning">Could not load tab: ${escapeHtml(err.message)}</div>`;
    }
  }

  async function init() {
    try {
      const res = await apiCall(`/employees/${employeeId}/profile`);
      profileData = res?.data ?? res;
      profilePermissions = profileData.permissions || null;
      activeTab = getTabFromUrl();
      setTabInUrl(activeTab);

      document.getElementById('epLoading')?.classList.add('d-none');
      document.getElementById('epContent')?.classList.remove('d-none');

      document.getElementById('epHero').innerHTML = renderHero(profileData.hero);
      renderStepper(profileData.checklist);
      renderTabsNav(profileData.tabFlags);
      initWorkflowForms();
      initOpsTabControls();
      await loadTab(activeTab);
    } catch (err) {
      showError(err.message || 'Failed to load employee profile');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
