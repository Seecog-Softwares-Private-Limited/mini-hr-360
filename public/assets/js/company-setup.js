(function () {
  const STEPS = [
    { key: 'company_details', label: 'Company Details', num: 1 },
    { key: 'branches', label: 'Branches', num: 2 },
    { key: 'departments_designations', label: 'Departments', num: 3 },
    { key: 'leave_policies', label: 'Leave Policies', num: 4 },
    { key: 'attendance_rules', label: 'Attendance', num: 5 },
    { key: 'invite_employees', label: 'Invite Team', num: 6 },
  ];

  const API = '/api/setup';
  let currentStepIdx = 0;
  let setupStatus = null;
  let canEdit = true;
  let dirty = false;
  let pendingNavIdx = null;
  let branches = [];
  let departments = [];
  let designations = [];
  let leaveTypes = [];
  let employees = [];

  async function setupFetch(path, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (!(opts.body instanceof FormData)) headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    const token = localStorage.getItem('accessToken');
    if (token) headers.Authorization = `Bearer ${token}`;
    const orgId = typeof getOrganizationId === 'function' ? getOrganizationId() : localStorage.getItem('mh360:organizationId');
    if (!orgId) {
      throw new Error('No organization selected. Open Company Profile and select your organization first.');
    }
    headers['x-business-id'] = orgId;
    const res = await fetch(`${API}${path}`, { credentials: 'include', ...opts, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || data.error || 'Request failed');
      err.errors = data.data?.errors || data.errors || [];
      throw err;
    }
    return data.data ?? data;
  }

  function clearFieldErrors(form) {
    form?.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    form?.querySelectorAll('.invalid-feedback').forEach((el) => el.remove());
    document.getElementById('setupFormAlert')?.remove();
  }

  function showFieldErrors(form, errors = []) {
    clearFieldErrors(form);
    if (!errors.length) return;
    const alert = document.createElement('div');
    alert.id = 'setupFormAlert';
    alert.className = 'alert alert-danger py-2';
    alert.innerHTML = `<strong>Please fix the following:</strong><ul class="mb-0 ps-3">${errors.map((e) => `<li>${e.message}</li>`).join('')}</ul>`;
    form?.prepend(alert);
    errors.forEach((e) => {
      const field = form?.elements[e.field] || form?.querySelector(`[name="${e.field}"]`);
      if (!field) return;
      field.classList.add('is-invalid');
      const fb = document.createElement('div');
      fb.className = 'invalid-feedback d-block';
      fb.textContent = e.message;
      field.insertAdjacentElement('afterend', fb);
    });
    form?.querySelector('.is-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function validateCompanyDetailsClient(payload) {
    const errors = [];
    if (!payload.legalName?.trim() && !payload.displayName?.trim()) {
      errors.push({ field: 'legalName', message: 'Legal company name is required' });
    }
    if (!payload.registeredAddress?.trim()) {
      errors.push({ field: 'registeredAddress', message: 'Registered address is required' });
    }
    if (!payload.panNumber?.trim()) {
      errors.push({ field: 'panNumber', message: 'PAN number is required' });
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(payload.panNumber.trim())) {
      errors.push({ field: 'panNumber', message: 'Invalid PAN format (e.g. ABCDE1234F)' });
    }
    if (payload.gstNumber?.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(payload.gstNumber.trim())) {
      errors.push({ field: 'gstNumber', message: 'Invalid GST format' });
    }
    if (payload.tanNumber?.trim() && !/^[A-Z]{4}[0-9]{5}[A-Z]$/i.test(payload.tanNumber.trim())) {
      errors.push({ field: 'tanNumber', message: 'Invalid TAN format' });
    }
    if (!payload.city?.trim()) errors.push({ field: 'city', message: 'City is required' });
    if (!payload.state?.trim()) errors.push({ field: 'state', message: 'State is required' });
    if (!payload.country?.trim()) errors.push({ field: 'country', message: 'Country is required' });
    if (!/^[1-9][0-9]{5}$/.test(String(payload.pincode || '').trim())) {
      errors.push({ field: 'pincode', message: 'Pincode must be 6 digits' });
    }
    return errors;
  }

  function setButtonLoading(btn, loading, label = 'Saving...') {
    if (!btn) return;
    if (loading) {
      btn.dataset.originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>${label}`;
    } else {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
    }
  }

  function setDirty(v = true) { dirty = v; }

  function renderStepper() {
    const el = document.getElementById('setupStepper');
    if (!el) return;
    el.innerHTML = STEPS.map((s, i) => {
      const completed = setupStatus?.steps?.find((x) => x.key === s.key)?.completed;
      return `<button type="button" class="setup-step-item ${i === currentStepIdx ? 'active' : ''} ${completed ? 'completed' : ''}" data-idx="${i}">
        <span class="step-num">${completed ? '<i class="fas fa-check" style="font-size:11px"></i>' : s.num}</span>
        <span><div class="step-label">${s.label}</div><div class="step-sublabel">${completed ? 'Complete' : 'Pending'}</div></span>
      </button>`;
    }).join('');
    el.querySelectorAll('.setup-step-item').forEach((btn) => {
      btn.addEventListener('click', () => goToStep(Number(btn.dataset.idx)));
    });
  }

  function renderProgress() {
    const score = setupStatus?.score ?? 0;
    document.getElementById('setupScoreLabel').textContent = `Company setup: ${score}% complete`;
    document.getElementById('setupProgressFill').style.width = `${score}%`;
    document.getElementById('setupStepBadge').textContent = `Step ${currentStepIdx + 1} of ${STEPS.length}`;
    const finishBtn = document.getElementById('setupFinishBtn');
    if (currentStepIdx === STEPS.length - 1) {
      finishBtn?.classList.remove('d-none');
      document.getElementById('setupContinueBtn')?.classList.add('d-none');
    } else {
      finishBtn?.classList.add('d-none');
      document.getElementById('setupContinueBtn')?.classList.remove('d-none');
    }
    document.getElementById('setupSkipBtn').hidden = STEPS[currentStepIdx].key !== 'invite_employees';
  }

  function renderMissing() {
    const panel = document.getElementById('missingItemsPanel');
    const items = setupStatus?.missingItems || [];
    if (!items.length) {
      panel.innerHTML = '<p class="text-success small mb-0"><i class="fas fa-check-circle"></i> No missing items</p>';
      return;
    }
    panel.innerHTML = items.map((m) =>
      `<div class="missing-item ${m.severity}"><strong>${m.step}</strong><br>${m.message}</div>`
    ).join('');
  }

  function showStep(idx) {
    currentStepIdx = idx;
    document.querySelectorAll('.setup-step-form').forEach((f) => f.classList.remove('active'));
    const key = STEPS[idx].key;
    document.getElementById(`step-${key}`)?.classList.add('active');
    renderStepper();
    renderProgress();
  }

  function goToStep(idx) {
    if (dirty && idx !== currentStepIdx) {
      pendingNavIdx = idx;
      new bootstrap.Modal(document.getElementById('unsavedModal')).show();
      return;
    }
    showStep(idx);
    loadStepData(keyFromIdx(idx));
  }

  function keyFromIdx(i) { return STEPS[i].key; }

  async function loadStatus() {
    setupStatus = await setupFetch('/status');
    canEdit = setupStatus.canEdit !== false;
    if (!canEdit) {
      document.getElementById('setupReadOnlyBanner')?.classList.remove('d-none');
      document.querySelector('.setup-main')?.classList.add('readonly-overlay');
      document.querySelectorAll('#setupSaveDraftBtn,#setupContinueBtn,#setupFinishBtn,#setupSkipBtn').forEach((b) => b?.classList.add('d-none'));
    }
    const resume = Math.max(0, (setupStatus.currentStep || 1) - 1);
    if (setupStatus.setupCompleted) currentStepIdx = 0;
    else currentStepIdx = Math.min(resume, STEPS.length - 1);
    renderStepper();
    renderProgress();
    renderMissing();
    await loadStepData(keyFromIdx(currentStepIdx));
  }

  async function loadStepData(key) {
    try {
      if (key === 'company_details') await loadCompanyDetails();
      if (key === 'branches') await loadBranches();
      if (key === 'departments_designations') await loadDeptDesig();
      if (key === 'leave_policies') await loadLeave();
      if (key === 'attendance_rules') await loadAttendance();
      if (key === 'invite_employees') await loadInvited();
    } catch (e) { console.warn('load step', e); }
    dirty = false;
  }

  function formToObject(form) {
    const fd = new FormData(form);
    const o = {};
    fd.forEach((v, k) => {
      if (form.elements[k]?.type === 'checkbox') o[k] = form.elements[k].checked;
      else o[k] = v;
    });
    form.querySelectorAll('input[type=checkbox]').forEach((cb) => { if (!fd.has(cb.name)) o[cb.name] = cb.checked; });
    return o;
  }

  function fillForm(form, data) {
    Object.entries(data || {}).forEach(([k, v]) => {
      const el = form.elements[k];
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v ?? '';
    });
  }

  async function loadCompanyDetails() {
    const d = await setupFetch('/company-details');
    fillForm(document.getElementById('step-company_details'), d);
    if (d.logoUrl) document.getElementById('logoPreview').innerHTML = `<img src="${d.logoUrl}" style="max-height:60px;border-radius:8px">`;
  }

  async function saveCompanyDetails() {
    const form = document.getElementById('step-company_details');
    const payload = formToObject(form);
    const clientErrors = validateCompanyDetailsClient(payload);
    if (clientErrors.length) {
      showFieldErrors(form, clientErrors);
      throw new Error(clientErrors[0].message);
    }
    clearFieldErrors(form);
    payload.legalName = payload.legalName?.trim();
    payload.displayName = payload.displayName?.trim();
    payload.panNumber = payload.panNumber?.trim().toUpperCase();
    payload.gstNumber = payload.gstNumber?.trim().toUpperCase();
    payload.tanNumber = payload.tanNumber?.trim().toUpperCase();
    await setupFetch('/company-details', { method: 'PUT', body: JSON.stringify(payload) });
    const logo = document.getElementById('logoUpload')?.files?.[0];
    if (logo) {
      try {
        const fd = new FormData();
        fd.append('logo', logo);
        await setupFetch('/company-details/logo', { method: 'POST', body: fd, headers: {} });
      } catch (e) {
        showToast(`Company saved, but logo upload failed: ${e.message}`, 'warning');
      }
    }
  }

  async function loadBranches() {
    const d = await setupFetch('/branches');
    branches = d.branches || [];
    renderBranches();
  }

  function renderBranches() {
    const list = document.getElementById('branchesList');
    if (!branches.length) { list.innerHTML = '<p class="text-muted small">No branches yet. Add your first branch.</p>'; return; }
    list.innerHTML = branches.map((b) =>
      `<div class="branch-row d-flex justify-content-between align-items-center">
        <div><strong>${b.name}</strong> ${b.isPrimary ? '<span class="badge bg-primary ms-1">Primary</span>' : ''}<br>
        <small class="text-muted">${b.city || ''} ${b.pincode || ''} · ${b.locationType}</small></div>
      </div>`
    ).join('');
  }

  function addBranchForm() {
    const tpl = document.getElementById('branchFormTemplate');
    const node = tpl.content.cloneNode(true);
    const row = node.querySelector('.branch-row');
    row.querySelector('.save-branch-btn').addEventListener('click', async () => {
      const payload = {};
      row.querySelectorAll('[data-field]').forEach((inp) => {
        const k = inp.dataset.field;
        payload[k] = inp.type === 'checkbox' ? inp.checked : inp.value;
      });
      await setupFetch('/branches', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Branch saved', 'success');
      await loadBranches();
      row.remove();
      await refreshStatus();
    });
    document.getElementById('branchesList').appendChild(node);
  }

  async function loadDeptDesig() {
    const d = await setupFetch('/departments-designations');
    departments = d.departments || [];
    designations = d.designations || [];
    employees = d.employees || [];
    renderDeptDesig();
  }

  function deptRow(d = {}) {
    return `<div class="mb-2 row g-1 dept-row" data-id="${d.id || ''}">
      <div class="col-5"><input class="form-control form-control-sm" placeholder="Name" value="${d.name || ''}" data-f="name"></div>
      <div class="col-3"><input class="form-control form-control-sm" placeholder="Code" value="${d.code || ''}" data-f="code"></div>
      <div class="col-4"><select class="form-select form-select-sm" data-f="headEmployeeId"><option value="">Head</option>
        ${employees.map((e) => `<option value="${e.id}" ${d.metadata?.headEmployeeId == e.id ? 'selected' : ''}>${e.empName || e.firstName}</option>`).join('')}
      </select></div></div>`;
  }

  function desigRow(d = {}) {
    return `<div class="mb-2 row g-1 desig-row" data-id="${d.id || ''}">
      <div class="col-5"><input class="form-control form-control-sm" placeholder="Name" value="${d.name || ''}" data-f="name"></div>
      <div class="col-3"><input class="form-control form-control-sm" placeholder="Level" value="${d.metaData?.level || ''}" data-f="level"></div>
      <div class="col-4"><input class="form-control form-control-sm" placeholder="Dept ID" value="${d.metaData?.departmentId || ''}" data-f="departmentId"></div></div>`;
  }

  function renderDeptDesig() {
    document.getElementById('deptList').innerHTML = departments.map(deptRow).join('') || deptRow();
    document.getElementById('desigList').innerHTML = designations.map(desigRow).join('') || desigRow();
  }

  function collectRows(selector, mapFn) {
    return [...document.querySelectorAll(selector)].map((row) => {
      const o = { id: row.dataset.id || undefined };
      row.querySelectorAll('[data-f]').forEach((inp) => { o[inp.dataset.f] = inp.value; });
      return mapFn ? mapFn(o, row) : o;
    }).filter((r) => r.name?.trim());
  }

  async function saveDeptDesig() {
    const departments = collectRows('.dept-row', (o) => ({
      id: o.id, name: o.name, code: o.code, headEmployeeId: o.headEmployeeId || null,
    }));
    const designations = collectRows('.desig-row', (o) => ({
      id: o.id, name: o.name, level: o.level, departmentId: o.departmentId || null,
    }));
    await setupFetch('/departments-designations', { method: 'POST', body: JSON.stringify({ departments, designations }) });
  }

  async function loadLeave() {
    const d = await setupFetch('/leave-policies');
    leaveTypes = d.leaveTypes || [];
    renderLeave();
  }

  function leaveRow(lt = {}) {
    const cfg = lt.policyConfig || {};
    return `<div class="leave-row mb-2" data-id="${lt.id || ''}">
      <div class="row g-2">
        <div class="col-md-3"><input class="form-control form-control-sm" placeholder="Name" value="${lt.name || ''}" data-f="name"></div>
        <div class="col-md-2"><input class="form-control form-control-sm" placeholder="Code" value="${lt.code || ''}" data-f="code"></div>
        <div class="col-md-2"><input class="form-control form-control-sm" type="number" placeholder="Quota" value="${lt.maxPerYear || ''}" data-f="annualQuota"></div>
        <div class="col-md-2"><div class="form-check"><input type="checkbox" data-f="isPaid" ${lt.isPaid !== false ? 'checked' : ''}><label class="small">Paid</label></div></div>
        <div class="col-md-3"><select class="form-select form-select-sm" data-f="approvalFlow">
          <option value="MANAGER_ONLY" ${cfg.approvalFlow === 'MANAGER_ONLY' ? 'selected' : ''}>Manager only</option>
          <option value="MANAGER_HR" ${cfg.approvalFlow === 'MANAGER_HR' || !cfg.approvalFlow ? 'selected' : ''}>Manager + HR</option>
          <option value="HR_ONLY" ${cfg.approvalFlow === 'HR_ONLY' ? 'selected' : ''}>HR only</option>
        </select></div>
        <div class="col-md-2"><div class="form-check"><input type="checkbox" data-f="allowCarryForward" ${lt.allowCarryForward ? 'checked' : ''}><label class="small">Carry Fwd</label></div></div>
        <div class="col-md-2"><input class="form-control form-control-sm" type="number" placeholder="Max CF" value="${lt.maxCarryForward || ''}" data-f="maxCarryForward"></div>
        <div class="col-md-2"><div class="form-check"><input type="checkbox" data-f="monthlyAccrual" ${cfg.monthlyAccrual ? 'checked' : ''}><label class="small">Monthly accrual</label></div></div>
        <div class="col-md-2"><div class="form-check"><input type="checkbox" data-f="encashment" ${cfg.encashment ? 'checked' : ''}><label class="small">Encashment</label></div></div>
        <div class="col-md-2"><div class="form-check"><input type="checkbox" data-f="negativeAllowed" ${cfg.negativeAllowed ? 'checked' : ''}><label class="small">Negative OK</label></div></div>
      </div></div>`;
  }

  function renderLeave() {
    document.getElementById('leaveList').innerHTML = leaveTypes.length ? leaveTypes.map(leaveRow).join('') : leaveRow();
  }

  async function saveLeave() {
    const policies = [...document.querySelectorAll('.leave-row')].map((row) => {
      const o = { id: row.dataset.id || undefined };
      row.querySelectorAll('[data-f]').forEach((inp) => {
        o[inp.dataset.f] = inp.type === 'checkbox' ? inp.checked : inp.value;
      });
      return o;
    }).filter((p) => p.name?.trim());
    await setupFetch('/leave-policies', { method: 'POST', body: JSON.stringify({ policies }) });
  }

  async function loadAttendance() {
    const d = await setupFetch('/attendance-rules');
    const rule = d.rule || {};
    const form = document.getElementById('step-attendance_rules');
    const cfg = rule.workWeekConfig || {};
    fillForm(form, {
      workWeekType: cfg.type || 'MON_FRI',
      defaultShiftId: rule.defaultShiftId || '',
      gracePeriodMinutes: rule.gracePeriodMinutes ?? 10,
      halfDayThresholdHours: rule.halfDayThresholdHours ?? 4,
      fullDayThresholdHours: rule.fullDayThresholdHours ?? 8,
      lateMarkAllowedCount: rule.lateMarkAllowedCount ?? 3,
      attendanceLockDay: rule.attendanceLockDay || '',
      autoAbsentEnabled: rule.autoAbsentEnabled !== false,
      overtimeEnabled: !!rule.overtimeEnabled,
      geoAttendanceEnabled: !!rule.geoAttendanceEnabled,
      selfieAttendanceEnabled: !!rule.selfieAttendanceEnabled,
      regularizationAllowed: rule.regularizationAllowed !== false,
    });
    const sel = document.getElementById('shiftSelect');
    sel.innerHTML = '<option value="">Create default shift</option>' +
      (d.shifts || []).map((s) => `<option value="${s.id}">${s.name} (${s.startTime}-${s.endTime})</option>`).join('');
    if (rule.defaultShiftId) sel.value = rule.defaultShiftId;
  }

  async function saveAttendance() {
    const form = document.getElementById('step-attendance_rules');
    const o = formToObject(form);
    const payload = {
      workWeekConfig: { type: o.workWeekType, days: o.workWeekType === 'MON_SAT' ? [1,2,3,4,5,6] : [1,2,3,4,5] },
      defaultShiftId: o.defaultShiftId || null,
      createDefaultShift: !o.defaultShiftId,
      gracePeriodMinutes: Number(o.gracePeriodMinutes),
      halfDayThresholdHours: Number(o.halfDayThresholdHours),
      fullDayThresholdHours: Number(o.fullDayThresholdHours),
      lateMarkAllowedCount: Number(o.lateMarkAllowedCount),
      attendanceLockDay: o.attendanceLockDay ? Number(o.attendanceLockDay) : null,
      autoAbsentEnabled: o.autoAbsentEnabled,
      overtimeEnabled: o.overtimeEnabled,
      geoAttendanceEnabled: o.geoAttendanceEnabled,
      selfieAttendanceEnabled: o.selfieAttendanceEnabled,
      regularizationAllowed: o.regularizationAllowed,
    };
    await setupFetch('/attendance-rules', { method: 'PUT', body: JSON.stringify(payload) });
  }

  async function loadInvited() {
    const d = await setupFetch('/departments-designations');
    const emps = d.employees || [];
    document.getElementById('invitedList').innerHTML = emps.length
      ? `<p class="small text-muted">${emps.length} employee(s) in organization</p>`
      : '<p class="small text-muted">No employees invited yet</p>';
  }

  async function inviteSingle() {
    const payload = {
      name: document.getElementById('invName').value,
      email: document.getElementById('invEmail').value,
      phone: document.getElementById('invPhone').value,
      department: document.getElementById('invDept').value,
      designation: document.getElementById('invDesig').value,
      doj: document.getElementById('invDoj').value,
      salary: document.getElementById('invSalary').value,
      sendInvitationEmail: document.getElementById('invSendEmail').checked,
    };
    await setupFetch('/invite-employees', { method: 'POST', body: JSON.stringify(payload) });
    showToast('Employee invited', 'success');
    await loadInvited();
  }

  async function uploadCsv() {
    const file = document.getElementById('csvUpload').files[0];
    if (!file) return showToast('Select a CSV file', 'danger');
    const fd = new FormData();
    fd.append('file', file);
    await setupFetch('/invite-employees/csv', { method: 'POST', body: fd, headers: {} });
    showToast('CSV imported', 'success');
    await loadInvited();
  }

  async function saveCurrentStep() {
    const key = keyFromIdx(currentStepIdx);
    if (key === 'company_details') await saveCompanyDetails();
    if (key === 'departments_designations') await saveDeptDesig();
    if (key === 'leave_policies') await saveLeave();
    if (key === 'attendance_rules') await saveAttendance();
    if (key === 'invite_employees') { /* optional step */ }
    dirty = false;
    await refreshStatus();
  }

  async function refreshStatus() {
    setupStatus = await setupFetch('/status');
    renderStepper();
    renderProgress();
    renderMissing();
  }

  async function finishSetup() {
    try {
      const r = await setupFetch('/finish', { method: 'POST', body: '{}' });
      showToast('Setup completed!', 'success');
      setupStatus = r;
      renderProgress();
    } catch (e) {
      showToast(e.message, 'danger');
    }
  }

  async function skipInvite() {
    await setupFetch('/skip-step', { method: 'POST', body: JSON.stringify({ stepKey: 'invite_employees', reason: 'Will invite later' }) });
    showToast('Step skipped', 'info');
    await refreshStatus();
    if (currentStepIdx < STEPS.length - 1) goToStep(currentStepIdx + 1);
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadStatus().catch((e) => showToast(e.message || 'Failed to load setup', 'danger'));

    document.getElementById('setupBackBtn')?.addEventListener('click', () => {
      if (currentStepIdx > 0) goToStep(currentStepIdx - 1);
    });

    document.getElementById('setupContinueBtn')?.addEventListener('click', async () => {
      if (!canEdit) return;
      const btn = document.getElementById('setupContinueBtn');
      setButtonLoading(btn, true);
      try {
        await saveCurrentStep();
        showToast('Saved successfully', 'success');
        if (currentStepIdx < STEPS.length - 1) goToStep(currentStepIdx + 1);
      } catch (e) {
        const form = document.querySelector('.setup-step-form.active');
        if (e.errors?.length) showFieldErrors(form, e.errors);
        showToast(e.message || 'Save failed', 'danger');
      } finally {
        setButtonLoading(btn, false);
      }
    });

    document.getElementById('setupSaveDraftBtn')?.addEventListener('click', async () => {
      if (!canEdit) return;
      const btn = document.getElementById('setupSaveDraftBtn');
      setButtonLoading(btn, true, 'Saving draft...');
      try {
        await saveCurrentStep();
        showToast('Draft saved', 'success');
      } catch (e) {
        const form = document.querySelector('.setup-step-form.active');
        if (e.errors?.length) showFieldErrors(form, e.errors);
        showToast(e.message || 'Save failed', 'danger');
      } finally {
        setButtonLoading(btn, false);
      }
    });

    document.getElementById('setupFinishBtn')?.addEventListener('click', finishSetup);
    document.getElementById('setupSkipBtn')?.addEventListener('click', skipInvite);
    document.getElementById('addBranchBtn')?.addEventListener('click', addBranchForm);
    document.getElementById('addDeptBtn')?.addEventListener('click', () => {
      document.getElementById('deptList').insertAdjacentHTML('beforeend', deptRow());
      setDirty();
    });
    document.getElementById('addDesigBtn')?.addEventListener('click', () => {
      document.getElementById('desigList').insertAdjacentHTML('beforeend', desigRow());
      setDirty();
    });
    document.getElementById('addLeaveBtn')?.addEventListener('click', () => {
      document.getElementById('leaveList').insertAdjacentHTML('beforeend', leaveRow());
      setDirty();
    });
    document.getElementById('inviteSingleBtn')?.addEventListener('click', async () => {
      try { await inviteSingle(); await refreshStatus(); } catch (e) { showToast(e.message, 'danger'); }
    });
    document.getElementById('uploadCsvBtn')?.addEventListener('click', async () => {
      try { await uploadCsv(); await refreshStatus(); } catch (e) { showToast(e.message, 'danger'); }
    });

    document.getElementById('confirmLeaveBtn')?.addEventListener('click', () => {
      dirty = false;
      bootstrap.Modal.getInstance(document.getElementById('unsavedModal'))?.hide();
      if (pendingNavIdx != null) { showStep(pendingNavIdx); loadStepData(keyFromIdx(pendingNavIdx)); pendingNavIdx = null; }
    });

    document.querySelectorAll('.setup-step-form').forEach((form) => {
      form.addEventListener('submit', (e) => e.preventDefault());
    });

    document.querySelector('.setup-main')?.addEventListener('input', () => setDirty());
    document.querySelector('.setup-main')?.addEventListener('change', () => setDirty());

    window.addEventListener('beforeunload', (e) => {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    });
  });
})();
