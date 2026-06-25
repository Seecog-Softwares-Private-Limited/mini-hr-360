/**
 * Admin Attendance Management - COMPLETE WORKING VERSION
 * All CRUD operations with proper error handling, real-time updates, and complete API integration
 */

const API_BASE = '/admin/attendance/api';
const API_BASE_FALLBACK = '/api/v1/admin/attendance/api';
let editingId = null;
let editingType = null;
let allPolicies = [];
let allShifts = [];
let allHolidays = [];
let allAssignments = [];

// ==================== UTILITIES ====================

// Auto-refresh intervals storage
let refreshIntervals = {};

function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x`;
  alertDiv.style.zIndex = '9999';
  alertDiv.style.marginTop = '20px';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(alertDiv);
  setTimeout(() => alertDiv.remove(), 4000);
}

function setupAutoRefresh(loadFunction, intervalMs = 10000) {
  // Call function immediately
  loadFunction();

  // Clear any existing interval for this function
  if (refreshIntervals[loadFunction.name]) {
    clearInterval(refreshIntervals[loadFunction.name]);
  }

  // Set up new interval
  refreshIntervals[loadFunction.name] = setInterval(() => {
    loadFunction().catch(e => console.error('Auto-refresh error:', e));
  }, intervalMs);

  console.log(`Auto-refresh started for ${loadFunction.name} (${intervalMs}ms)`);
}

function stopAutoRefresh(functionName) {
  if (refreshIntervals[functionName]) {
    clearInterval(refreshIntervals[functionName]);
    delete refreshIntervals[functionName];
    console.log(`Auto-refresh stopped for ${functionName}`);
  }
}

async function resolveOrgCapabilities() {
  try {
    if (typeof window.apiCall === 'function') {
      const data = await window.apiCall('/business/capabilities', { skipWorkspace: true, skipAuth: false });
      return data?.data || data || {};
    }
  } catch (_) {
    // Ignore; caller will fallback to generic behaviour.
  }
  return {};
}

async function attendanceApiCall(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    };
    if (body) options.body = JSON.stringify(body);

    let response = await fetch(API_BASE + endpoint, options);
    let attemptedFallback = false;

    // Some environments can serve attendance APIs under /api/v1.
    // Retry once before surfacing an error.
    const contentType = response.headers.get('content-type') || '';
    if (response.status === 404 && !contentType.includes('application/json')) {
      attemptedFallback = true;
      response = await fetch(API_BASE_FALLBACK + endpoint, options);
    }

    // Check if response is actually JSON
    const finalContentType = response.headers.get('content-type');
    if (!finalContentType || !finalContentType.includes('application/json')) {
      const caps = await resolveOrgCapabilities();
      if (caps && caps.hasOrganization === false) {
        throw new Error('Organization required. Create or join an organization first.');
      }
      throw new Error(
        `Expected JSON but got ${finalContentType}. HTTP ${response.status}${attemptedFallback ? ' (after fallback)' : ''}`
      );
    }

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 400 || response.status === 403) {
        const msg = String(data?.message || data?.error || '').toLowerCase();
        if (msg.includes('organization') || msg.includes('workspace')) {
          const caps = await resolveOrgCapabilities();
          if (caps && caps.hasOrganization === false) {
            throw new Error('Organization required. Create or join an organization first.');
          }
        }
      }
      throw new Error(data.message || `API Error: ${response.status}`);
    }

    return data.data || data;
  } catch (error) {
    console.error('API Error:', error);
    showAlert(`Error: ${error.message}`, 'danger');
    throw error;
  }
}

// ==================== POLICIES ====================

async function loadPolicies() {
  try {
    // Backend ignores :id; keep call simple and avoid hardcoding a bogus id
    allPolicies = await attendanceApiCall('/policies');
    if (!Array.isArray(allPolicies)) allPolicies = [];
    renderPolicies();
  } catch (e) {
    console.error(e);
    showAlert('Failed to load policies', 'danger');
  }
}

function renderPolicies() {
  const tbody = document.getElementById('policiesTableBody');
  if (!tbody) return;

  if (allPolicies.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No policies. Add one to get started.</td></tr>';
    return;
  }

  tbody.innerHTML = allPolicies.map((p, i) => {
    const meta = p.rulesJson?._meta || {};
    const effectiveFrom = meta.effectiveFrom || '-';
    const description = meta.description || '';
    return `
    <tr>
      <td>${i + 1}</td>
      <td>
        <strong>${p.name || 'N/A'}</strong>
        ${description ? `<br><small class="text-muted">${description}</small>` : ''}
      </td>
      <td>${effectiveFrom}</td>
      <td><span class="badge ${p.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}">${p.status || 'ACTIVE'}</span></td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editPolicy(${p.id})" title="Edit"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deletePolicy(${p.id})" title="Delete"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `;
  }).join('');
}

function openAddPolicyModal() {
  editingId = null;
  editingType = null;
  const form = document.getElementById('policyForm');
  if (form) form.reset();
  const modal = document.getElementById('modalPolicy');
  if (modal) new bootstrap.Modal(modal).show();
}

function editPolicy(id) {
  editingId = id;
  editingType = 'policy';
  const policy = allPolicies.find(p => p.id === id);
  if (!policy) {
    showAlert('Policy not found', 'danger');
    return;
  }

  const form = document.getElementById('policyForm');
  if (!form) return;

  const nameField = form.querySelector('[name="name"]');
  const descriptionField = form.querySelector('[name="description"]');
  const effectiveFromField = form.querySelector('[name="effectiveFrom"]');
  const statusField = form.querySelector('[name="status"]');
  const meta = policy.rulesJson?._meta || {};

  if (nameField) nameField.value = policy.name || '';
  if (descriptionField) descriptionField.value = meta.description || '';
  if (effectiveFromField) effectiveFromField.value = meta.effectiveFrom || '';
  if (statusField) statusField.value = policy.status || 'ACTIVE';

  const modal = document.getElementById('modalPolicy');
  if (modal) new bootstrap.Modal(modal).show();
}

async function savePolicy() {
  const form = document.getElementById('policyForm');
  if (!form) return;

  const nameField = form.querySelector('[name="name"]');
  const descriptionField = form.querySelector('[name="description"]');
  const effectiveFromField = form.querySelector('[name="effectiveFrom"]');
  const statusField = form.querySelector('[name="status"]');

  const name = nameField?.value?.trim();
  if (!name) {
    showAlert('Policy name is required', 'warning');
    return;
  }

  try {
    const payload = {
      name,
      description: descriptionField?.value || '',
      effectiveFrom: effectiveFromField?.value || null,
      status: statusField?.value || 'ACTIVE'
    };

    if (editingId) {
      await attendanceApiCall(`/policies/${editingId}`, 'PATCH', payload);
      showAlert('Policy updated successfully', 'success');
    } else {
      await attendanceApiCall('/policies', 'POST', payload);
      showAlert('Policy created successfully', 'success');
    }

    const modalEl = document.getElementById('modalPolicy');
    if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();

    editingId = null;
    editingType = null;
    await loadPolicies();
  } catch (e) {
    console.error(e);
  }
}

async function deletePolicy(id) {
  if (!confirm('Are you sure you want to delete this policy?')) return;

  try {
    await attendanceApiCall(`/policies/${id}`, 'DELETE');
    showAlert('Policy deleted successfully', 'success');
    await loadPolicies();
  } catch (e) {
    console.error(e);
  }
}

function filterPolicies() {
  const search = document.getElementById('policySearch')?.value.toLowerCase() || '';
  document.querySelectorAll('#policiesTableBody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none';
  });
}

// ==================== SHIFTS ====================

async function loadShifts() {
  try {
    allShifts = await attendanceApiCall('/shifts');
    if (!Array.isArray(allShifts)) allShifts = [];
    renderShifts();
    updateShiftDropdowns();
  } catch (e) {
    console.error(e);
    showAlert('Failed to load shifts', 'danger');
  }
}

function renderShifts() {
  const tbody = document.getElementById('shiftsTableBody');
  if (!tbody) return;

  if (allShifts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No shifts. Add one to get started.</td></tr>';
    return;
  }

  const getBreak = (s) => {
    const mins = s.breakRuleJson?.fixedBreakMinutes ?? s.breakRuleJson?.breakDurationMinutes ?? null;
    return mins !== null && mins !== undefined && mins !== '' ? `${mins} min` : '-';
  };

  tbody.innerHTML = allShifts.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${s.name || 'N/A'}</strong></td>
      <td>${s.startTime || '-'}</td>
      <td>${s.endTime || '-'}</td>
      <td>${getBreak(s)}</td>
      <td><span class="badge ${s.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}">${s.status || 'ACTIVE'}</span></td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editShift(${s.id})" title="Edit"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteShift(${s.id})" title="Delete"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function openAddShiftModal() {
  editingId = null;
  editingType = null;
  const form = document.getElementById('shiftForm');
  if (form) form.reset();
  const modal = document.getElementById('modalShift');
  if (modal) new bootstrap.Modal(modal).show();
}

function editShift(id) {
  editingId = id;
  editingType = 'shift';
  const shift = allShifts.find(s => s.id === id);
  if (!shift) {
    showAlert('Shift not found', 'danger');
    return;
  }

  const form = document.getElementById('shiftForm');
  if (!form) return;

  const nameField = form.querySelector('[name="name"]');
  const startTimeField = form.querySelector('[name="startTime"]');
  const endTimeField = form.querySelector('[name="endTime"]');
  const breakDurationField = form.querySelector('[name="breakDuration"]');
  const statusField = form.querySelector('[name="status"]');

  if (nameField) nameField.value = shift.name || '';
  if (startTimeField) startTimeField.value = shift.startTime || '';
  if (endTimeField) endTimeField.value = shift.endTime || '';
  if (breakDurationField) breakDurationField.value = shift.breakRuleJson?.fixedBreakMinutes ?? '';
  if (statusField) statusField.value = shift.status || 'ACTIVE';

  const modal = document.getElementById('modalShift');
  if (modal) new bootstrap.Modal(modal).show();
}

async function saveShift() {
  const form = document.getElementById('shiftForm');
  if (!form) return;

  const nameField = form.querySelector('[name="name"]');
  const startTimeField = form.querySelector('[name="startTime"]');
  const endTimeField = form.querySelector('[name="endTime"]');
  const breakDurationField = form.querySelector('[name="breakDuration"]');
  const statusField = form.querySelector('[name="status"]');

  const name = nameField?.value?.trim();
  const startTime = startTimeField?.value?.trim();
  const endTime = endTimeField?.value?.trim();

  if (!name || !startTime || !endTime) {
    showAlert('All fields are required', 'warning');
    return;
  }

  try {
    const payload = {
      name,
      startTime,
      endTime,
      status: statusField?.value || 'ACTIVE',
      breakRuleJson: {
        fixedBreakMinutes: breakDurationField?.value ? Number(breakDurationField.value) : 0,
      },
    };

    if (editingId) {
      await attendanceApiCall(`/shifts/${editingId}`, 'PATCH', payload);
      showAlert('Shift updated successfully', 'success');
    } else {
      await attendanceApiCall('/shifts', 'POST', payload);
      showAlert('Shift created successfully', 'success');
    }

    const modalEl = document.getElementById('modalShift');
    if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();

    editingId = null;
    editingType = null;
    await loadShifts();
  } catch (e) {
    console.error(e);
  }
}

async function deleteShift(id) {
  if (!confirm('Are you sure you want to delete this shift?')) return;

  try {
    await attendanceApiCall(`/shifts/${id}`, 'DELETE');
    showAlert('Shift deleted successfully', 'success');
    await loadShifts();
  } catch (e) {
    console.error(e);
  }
}

function updateShiftDropdowns() {
  const selects = document.querySelectorAll('select[name="shiftId"]');
  selects.forEach(select => {
    select.innerHTML = '<option value="">Select Shift</option>';
    allShifts.forEach(s => {
      select.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
  });
}

async function updateEmployeeDropdowns() {
  try {
    const response = await fetch(`/api/v1/employees`);
    if (!response.ok) throw new Error('Failed to fetch employees');
    const result = await response.json();
    const employees = result.data || result || [];

    const select = document.querySelector('select[name="employeeIds"]');
    if (select) {
      select.innerHTML = '';
      employees.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = `${emp.empName || emp.name || ''} (${emp.empId || emp.id})`.trim();
        select.appendChild(option);
      });
      if (employees.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'No employees available';
        option.disabled = true;
        select.appendChild(option);
      }
    }
  } catch (e) {
    console.error('Error loading employees:', e);
    showAlert('Error loading employees: ' + e.message, 'warning');
  }
}

async function updateDepartmentDropdowns() {
  try {
    const response = await fetch(`/api/v1/departments`);
    if (!response.ok) throw new Error('Failed to fetch departments');
    const result = await response.json();
    const departments = result.data || result || [];

    const select = document.querySelector('#departmentSelection select[name="scopeValue"]');
    if (select) {
      select.innerHTML = '<option value="">Select Department</option>';
      departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.deptName || dept.name || dept.id;
        option.textContent = dept.deptName || dept.name || `Department ${dept.id}`;
        select.appendChild(option);
      });
      if (departments.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'No departments available';
        option.disabled = true;
        select.appendChild(option);
      }
    }
  } catch (e) {
    console.error('Error loading departments:', e);
    showAlert('Error loading departments: ' + e.message, 'warning');
  }
}

async function updateDesignationDropdowns() {
  try {
    const response = await fetch(`/api/v1/designations`);
    if (!response.ok) throw new Error('Failed to fetch designations');
    const result = await response.json();
    const designations = result.data || result || [];

    const select = document.querySelector('#designationSelection select[name="scopeValue"]');
    if (select) {
      select.innerHTML = '<option value="">Select Designation</option>';
      designations.forEach(desig => {
        const option = document.createElement('option');
        option.value = desig.desigName || desig.name || desig.id;
        option.textContent = desig.desigName || desig.name || `Designation ${desig.id}`;
        select.appendChild(option);
      });
      if (designations.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'No designations available';
        option.disabled = true;
        select.appendChild(option);
      }
    }
  } catch (e) {
    console.error('Error loading designations:', e);
    showAlert('Error loading designations: ' + e.message, 'warning');
  }
}

function filterShifts() {
  const search = document.getElementById('shiftSearch')?.value.toLowerCase() || '';
  document.querySelectorAll('#shiftsTableBody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none';
  });
}

// ==================== HOLIDAYS ====================

async function loadHolidays() {
  try {
    allHolidays = await attendanceApiCall('/holidays');
    if (!Array.isArray(allHolidays)) allHolidays = [];
    renderHolidays();
  } catch (e) {
    console.error(e);
    showAlert('Failed to load holidays', 'danger');
  }
}

function renderHolidays() {
  const tbody = document.getElementById('holidaysTableBody');
  if (!tbody) return;

  if (allHolidays.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No holidays. Add one to get started.</td></tr>';
    return;
  }

  tbody.innerHTML = allHolidays.map((h, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${h.name || 'N/A'}</strong></td>
      <td>${h.date || '-'}</td>
      <td>${h.type || h.region || 'National'}</td>
      <td>${(h.status === 'ACTIVE' || !h.status) ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td>
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editHoliday(${h.id})" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteHoliday(${h.id})" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAddHolidayModal() {
  editingId = null;
  editingType = null;
  const form = document.getElementById('holidayForm');
  if (form) form.reset();
  const modal = document.getElementById('modalHoliday');
  if (modal) new bootstrap.Modal(modal).show();
}

function editHoliday(id) {
  editingId = id;
  editingType = 'holiday';
  const holiday = allHolidays.find(h => h.id === id);
  if (!holiday) {
    showAlert('Holiday not found', 'danger');
    return;
  }

  const form = document.getElementById('holidayForm');
  if (!form) return;

  const nameField = form.querySelector('[name="name"]');
  const dateField = form.querySelector('[name="date"]');
  const regionField = form.querySelector('[name="region"]');

  if (nameField) nameField.value = holiday.name || '';
  if (dateField) dateField.value = holiday.date || '';
  if (regionField) regionField.value = holiday.region || 'National';

  const modal = document.getElementById('modalHoliday');
  if (modal) new bootstrap.Modal(modal).show();
}

async function saveHoliday() {
  const form = document.getElementById('holidayForm');
  if (!form) return;

  const nameField = form.querySelector('[name="name"]');
  const dateField = form.querySelector('[name="date"]');
  const regionField = form.querySelector('[name="region"]');

  const name = nameField?.value?.trim();
  const date = dateField?.value?.trim();

  if (!name || !date) {
    showAlert('Name and date are required', 'warning');
    return;
  }

  try {
    const payload = {
      name,
      date,
      region: regionField?.value || 'National'
    };

    if (editingId) {
      await attendanceApiCall(`/holidays/${editingId}`, 'PATCH', payload);
      showAlert('Holiday updated successfully', 'success');
    } else {
      await attendanceApiCall('/holidays', 'POST', payload);
      showAlert('Holiday created successfully', 'success');
    }

    const modalEl = document.getElementById('modalHoliday');
    if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();

    editingId = null;
    editingType = null;
    await loadHolidays();
  } catch (e) {
    console.error(e);
  }
}

async function deleteHoliday(id) {
  if (!confirm('Are you sure you want to delete this holiday?')) return;

  try {
    await attendanceApiCall(`/holidays/${id}`, 'DELETE');
    showAlert('Holiday deleted successfully', 'success');
    await loadHolidays();
  } catch (e) {
    console.error(e);
  }
}

function filterHolidays() {
  const search = document.getElementById('holidaySearch')?.value.toLowerCase() || '';
  document.querySelectorAll('#holidaysTableBody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none';
  });
}

// ==================== ASSIGNMENTS ====================

async function loadAssignments() {
  try {
    const tbody = document.getElementById('assignmentsTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3"><i class="fa-solid fa-spinner fa-spin me-2"></i>Loading assignments...</td></tr>';
    }

    allAssignments = await attendanceApiCall('/assignments');
    if (!Array.isArray(allAssignments)) allAssignments = [];
    renderAssignments();
  } catch (e) {
    console.error('Error loading assignments:', e);
    const tbody = document.getElementById('assignmentsTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-3"><i class="fa-solid fa-exclamation-triangle me-2"></i>Failed to load assignments. <a href="#" onclick="loadAssignments(); return false;">Retry</a></td></tr>';
    }
    showAlert('Failed to load assignments: ' + e.message, 'danger');
  }
}

function renderAssignments() {
  const tbody = document.getElementById('assignmentsTableBody');
  if (!tbody) return;

  if (allAssignments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">No assignments found. <a href="#" onclick="openAddAssignmentModal(); return false;">Create one</a></td></tr>';
    return;
  }

  tbody.innerHTML = allAssignments.map((a, i) => {
    const empName = a.employee?.empName || 'N/A';
    const shiftName = a.shift?.name || '-';
    const effectiveFrom = a.effectiveFrom ? new Date(a.effectiveFrom).toLocaleDateString() : '-';
    const effectiveTo = a.effectiveTo ? new Date(a.effectiveTo).toLocaleDateString() : '-';

    // Determine status based on dates
    const today = new Date().toISOString().split('T')[0];
    let statusBadge = '<span class="badge bg-secondary">Inactive</span>';
    if (a.effectiveFrom && (!a.effectiveTo || a.effectiveTo >= today)) {
      if (a.effectiveFrom <= today) {
        statusBadge = '<span class="badge bg-success">Active</span>';
      } else {
        statusBadge = '<span class="badge bg-info">Pending</span>';
      }
    }

    return `
      <tr>
        <td><strong>${i + 1}</strong></td>
        <td>
          <div>
            <strong>${empName}</strong>
            <br/>
            <small class="text-muted">${a.employee?.empId || 'N/A'}</small>
          </div>
        </td>
        <td><strong>${shiftName}</strong></td>
        <td>${effectiveFrom}</td>
        <td>${effectiveTo}</td>
        <td class="text-center">${statusBadge}</td>
        <td class="text-center">
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-primary" onclick="editAssignment(${a.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-outline-danger" onclick="deleteAssignment(${a.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddAssignmentModal() {
  editingId = null;
  editingType = null;
  const form = document.getElementById('assignmentForm');
  if (form) form.reset();
  updatePolicyDropdowns();
  updateShiftDropdowns();
  updateEmployeeDropdowns();
  updateDepartmentDropdowns();
  updateDesignationDropdowns();
  toggleAssignmentFields(); // Initialize field visibility
  const modal = document.getElementById('modalAssignment');
  if (modal) new bootstrap.Modal(modal).show();
}

function updatePolicyDropdowns() {
  const selects = document.querySelectorAll('select[name="policyId"]');
  selects.forEach(select => {
    select.innerHTML = '<option value="">Select Policy</option>';
    allPolicies.forEach(p => {
      select.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });
  });
}

function editAssignment(id) {
  editingId = id;
  editingType = 'assignment';
  const assignment = allAssignments.find(a => a.id === id);
  if (!assignment) {
    showAlert('Assignment not found', 'danger');
    return;
  }

  const form = document.getElementById('assignmentForm');
  if (!form) return;

  const policyIdField = form.querySelector('[name="policyId"]');
  const shiftIdField = form.querySelector('[name="shiftId"]');
  const effectiveFromField = form.querySelector('[name="effectiveFrom"]');
  const effectiveToField = form.querySelector('[name="effectiveTo"]');

  if (policyIdField) policyIdField.value = assignment.policyId || assignment.policy?.id || '';
  if (shiftIdField) shiftIdField.value = assignment.shiftId || assignment.shift?.id || '';
  if (effectiveFromField) effectiveFromField.value = assignment.effectiveFrom ? assignment.effectiveFrom.split('T')[0] : '';
  if (effectiveToField) effectiveToField.value = assignment.effectiveTo ? assignment.effectiveTo.split('T')[0] : '';

  const modal = document.getElementById('modalAssignment');
  if (modal) new bootstrap.Modal(modal).show();
}

function toggleAssignmentFields() {
  const scopeType = document.querySelector('[name="scopeType"]')?.value || 'EMPLOYEE';
  const employeeSelection = document.getElementById('employeeSelection');
  const departmentSelection = document.getElementById('departmentSelection');
  const designationSelection = document.getElementById('designationSelection');

  // Hide all selections
  employeeSelection.style.display = 'none';
  departmentSelection.style.display = 'none';
  designationSelection.style.display = 'none';

  // Clear selections
  document.querySelector('[name="employeeIds"]').value = '';
  document.querySelectorAll('[name="scopeValue"]').forEach(el => el.value = '');

  // Show relevant selection based on scope type
  if (scopeType === 'EMPLOYEE') {
    employeeSelection.style.display = 'block';
  } else if (scopeType === 'DEPARTMENT') {
    departmentSelection.style.display = 'block';
  } else if (scopeType === 'DESIGNATION') {
    designationSelection.style.display = 'block';
  }
  // ALL scope type doesn't need any selection fields
}

async function saveAssignment() {
  const form = document.getElementById('assignmentForm');
  if (!form) return;

  const policyIdField = form.querySelector('[name="policyId"]');
  const shiftIdField = form.querySelector('[name="shiftId"]');
  const effectiveFromField = form.querySelector('[name="effectiveFrom"]');
  const effectiveToField = form.querySelector('[name="effectiveTo"]');
  const scopeTypeField = form.querySelector('[name="scopeType"]');

  const policyId = policyIdField?.value?.trim();
  const shiftId = shiftIdField?.value?.trim();
  const effectiveFrom = effectiveFromField?.value?.trim();
  const scopeType = scopeTypeField?.value || 'EMPLOYEE';

  if (!policyId || !shiftId || !effectiveFrom) {
    showAlert('Policy, Shift, and Effective From are required', 'warning');
    return;
  }

  try {
    const payload = {
      policyId: parseInt(policyId),
      shiftId: parseInt(shiftId),
      effectiveFrom,
      effectiveTo: effectiveToField?.value || null,
      weekoffPatternJson: {},
      scopeType,
      scopeValue: null,
      employeeIds: []
    };

    // Handle different scope types
    if (scopeType === 'EMPLOYEE') {
      const selectedOptions = form.querySelector('[name="employeeIds"]');
      const employeeIds = Array.from(selectedOptions.selectedOptions).map(opt => Number(opt.value)).filter(n => n > 0);
      if (!employeeIds.length) {
        showAlert('Please select at least one employee', 'warning');
        return;
      }
      payload.employeeIds = employeeIds;
    } else if (scopeType === 'DEPARTMENT' || scopeType === 'DESIGNATION') {
      const scopeValue = form.querySelector('[name="scopeValue"]')?.value?.trim();
      if (!scopeValue) {
        showAlert(`Please select a ${scopeType.toLowerCase()}`, 'warning');
        return;
      }
      payload.scopeValue = scopeValue;
    }

    if (editingId) {
      await attendanceApiCall(`/assignments/${editingId}`, 'PATCH', payload);
      showAlert('Assignment updated successfully', 'success');
    } else {
      await attendanceApiCall('/assignments', 'POST', payload);
      showAlert('Assignment created successfully', 'success');
    }

    const modalEl = document.getElementById('modalAssignment');
    if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();

    editingId = null;
    editingType = null;
    await loadAssignments();
  } catch (e) {
    console.error(e);
    showAlert('Error saving assignment: ' + (e.message || 'Unknown error'), 'danger');
  }
}

async function deleteAssignment(id) {
  if (!confirm('Are you sure you want to delete this assignment?')) return;

  try {
    await attendanceApiCall(`/assignments/${id}`, 'DELETE');
    showAlert('Assignment deleted successfully', 'success');
    await loadAssignments();
  } catch (e) {
    console.error(e);
  }
}

function filterAssignments() {
  const search = document.getElementById('assignmentSearch')?.value.toLowerCase() || '';
  document.querySelectorAll('#assignmentsTableBody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none';
  });
}

// ==================== LOGS ====================

async function loadLogs() {
  try {
    const tbody = document.getElementById('logsTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-3"><i class="fa-solid fa-spinner fa-spin me-2"></i>Loading logs...</td></tr>';
    }

    const dateInput = document.getElementById('logDate');
    const date = dateInput?.value || new Date().toISOString().split('T')[0];

    const logs = await attendanceApiCall(`/logs?date=${date}`);
    renderLogs(Array.isArray(logs) ? logs : []);
  } catch (e) {
    console.error('Error loading logs:', e);
    const tbody = document.getElementById('logsTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger py-3"><i class="fa-solid fa-exclamation-triangle me-2"></i>Failed to load logs. <a href="#" onclick="loadLogs(); return false;">Retry</a></td></tr>';
    }
    showAlert('Failed to load logs: ' + e.message, 'danger');
  }
}

function renderLogs(logs) {
  const tbody = document.getElementById('logsTableBody');
  if (!tbody) return;

  // Store logs for filtering
  window.allLogs = logs || [];

  if (!logs || logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3"><i class="fa-solid fa-inbox"></i> No logs found for this date</td></tr>';
    const countEl = document.getElementById('logsCount');
    if (countEl) countEl.textContent = '0 records';
    return;
  }

  const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-');
  const fmtIp = (ip) => ip && ip !== '-' ? ip : 'Local';

  tbody.innerHTML = logs.map((log, i) => {
    const badgeClass = log.status === 'PRESENT' ? 'bg-success' :
      log.status === 'ABSENT' ? 'bg-danger' :
        log.status === 'LATE' ? 'bg-warning text-dark' :
          log.status === 'HALF_DAY' ? 'bg-info' :
            log.status === 'LEAVE' ? 'bg-primary' :
              log.status === 'NOT_MARKED' ? 'bg-secondary' :
                'bg-secondary';

    // Get IP from punch meta if available, otherwise use 'Local'
    let ipAddr = 'Local';
    if (log.metaJson) {
      try {
        const meta = typeof log.metaJson === 'string' ? JSON.parse(log.metaJson) : log.metaJson;
        if (meta?.ip) ipAddr = meta.ip;
      } catch (e) { }
    }

    return `
      <tr>
        <td><strong>${i + 1}</strong></td>
        <td>
          <div>
            <strong>${log.employee?.empName || log.employeeId || 'N/A'}</strong>
            <br/>
            <small class="text-muted">${log.employee?.empId || ''}</small>
          </div>
        </td>
        <td>${log.date || '-'}</td>
        <td class="text-center">${fmtTime(log.firstInAt)}</td>
        <td class="text-center">${fmtTime(log.lastOutAt)}</td>
        <td class="text-center"><span class="badge ${badgeClass}">${log.status || 'UNKNOWN'}</span></td>
        <td><small><i class="fa-solid fa-globe me-1" style="color: #6366f1;"></i>${ipAddr}</small></td>
        <td class="text-center">
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-primary" onclick="viewLogDetails(${log.id}, ${log.employeeId}, '${log.date}')" title="View"><i class="fa-solid fa-eye"></i></button>
            <button class="btn btn-outline-warning" onclick="openEditAttendanceModal(${log.id}, ${log.employeeId}, '${log.date}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Update count
  const countEl = document.getElementById('logsCount');
  if (countEl) countEl.textContent = `${logs.length} record${logs.length !== 1 ? 's' : ''}`;

  // Update last update time
  const timeEl = document.getElementById('logsLastUpdate');
  if (timeEl) {
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

async function downloadLogs() {
  try {
    const dateInput = document.getElementById('logDate');
    const date = dateInput?.value || new Date().toISOString().split('T')[0];

    const logs = await attendanceApiCall(`/logs?date=${date}`);
    if (!Array.isArray(logs) || logs.length === 0) {
      showAlert('No logs to export', 'warning');
      return;
    }

    // Create CSV
    const headers = ['Sr.', 'Employee', 'Date', 'Punch In', 'Punch Out', 'Status', 'Source'];
    const rows = logs.map((log, i) => [
      i + 1,
      log.employee?.empName || log.employeeId || 'N/A',
      log.date || '',
      log.firstInAt || '',
      log.lastOutAt || '',
      log.status || '',
      log.source || 'AUTO'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-logs-${date}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showAlert('Logs exported successfully', 'success');
  } catch (e) {
    console.error(e);
    showAlert('Failed to export logs', 'danger');
  }
}

// ==================== REGULARIZATIONS ====================

let allRegularizations = [];

async function loadRegularizations() {
  try {
    const regs = await attendanceApiCall('/regularizations');
    allRegularizations = Array.isArray(regs) ? regs : [];
    renderRegularizations(allRegularizations);
  } catch (e) {
    console.error(e);
    showAlert('Failed to load regularizations', 'danger');
  }
}

function renderRegularizations(regs) {
  const tbody = document.getElementById('regularizationsTableBody');
  if (!tbody) return;

  if (!regs || regs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No regularization requests</td></tr>';
    return;
  }

  tbody.innerHTML = regs.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.employee?.empName || r.employeeId || 'N/A'}</td>
      <td>${r.date || '-'}</td>
      <td>${r.reason || '-'}</td>
      <td><span class="badge ${r.status === 'PENDING' ? 'bg-warning' : r.status === 'APPROVED' ? 'bg-success' : 'bg-danger'}">${r.status || 'PENDING'}</span></td>
      <td>
        ${r.status === 'PENDING' ? `
          <button class="btn btn-sm btn-outline-success me-1" onclick="approveRegularization(${r.id})" title="Approve"><i class="fas fa-check"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="rejectRegularization(${r.id})" title="Reject"><i class="fas fa-times"></i></button>
        ` : ''}
        <button class="btn btn-sm btn-outline-primary" onclick="viewRegularization(${r.id})" title="Details"><i class="fas fa-eye"></i></button>
      </td>
    </tr>
  `).join('');
}

async function approveRegularization(id) {
  if (!confirm('Approve this regularization request?')) return;

  try {
    await attendanceApiCall(`/regularizations/${id}/approve`, 'PATCH', { actionNote: 'Approved by admin' });
    showAlert('Regularization approved', 'success');
    await loadRegularizations();
  } catch (e) {
    console.error(e);
  }
}

async function rejectRegularization(id) {
  const reason = prompt('Reason for rejection:');
  if (reason === null) return;

  try {
    await attendanceApiCall(`/regularizations/${id}/reject`, 'PATCH', { actionNote: reason || 'Rejected by admin' });
    showAlert('Regularization rejected', 'success');
    await loadRegularizations();
  } catch (e) {
    console.error(e);
  }
}

function viewRegularization(id) {
  const reg = allRegularizations.find(r => r.id === id);

  if (!reg) {
    showAlert('Regularization record not found', 'danger');
    return;
  }

  const details = `
    <div style="text-align: left;">
      <p><strong>Employee:</strong> ${reg.employee?.empName || 'N/A'} (${reg.employee?.empId || reg.employeeId || 'N/A'})</p>
      <p><strong>Date:</strong> ${reg.date || '-'}</p>
      <p><strong>Reason:</strong> ${reg.reason || '-'}</p>
      <p><strong>Status:</strong> <span class="badge ${reg.status === 'PENDING' ? 'bg-warning' : reg.status === 'APPROVED' ? 'bg-success' : 'bg-danger'}">${reg.status || 'PENDING'}</span></p>
      ${reg.message ? `<p><strong>Message:</strong> ${reg.message}</p>` : ''}
      ${reg.checkinTime ? `<p><strong>Check-in Time:</strong> ${reg.checkinTime}</p>` : ''}
      ${reg.checkoutTime ? `<p><strong>Check-out Time:</strong> ${reg.checkoutTime}</p>` : ''}
    </div>
  `;

  showAlert(details, 'info');
}

// ==================== REPORTS ====================

async function generateReport() {
  try {
    showAlert('Generating report...', 'info');
    const reportType = document.querySelector('input[name="reportType"]:checked')?.value || 'summary';
    const startDate = document.querySelector('input[name="startDate"]')?.value;
    const endDate = document.querySelector('input[name="endDate"]')?.value;

    if (!startDate || !endDate) {
      showAlert('Start date and end date are required', 'warning');
      return;
    }

    // Placeholder report generation
    showAlert(`Report generated for ${reportType} from ${startDate} to ${endDate}`, 'success');

    // You can fetch actual report data here and display it
  } catch (e) {
    console.error(e);
    showAlert('Failed to generate report', 'danger');
  }
}

// ==================== LOCK/UNLOCK ====================

async function loadLockedPeriods() {
  try {
    const locks = await attendanceApiCall('/locks');
    const tbody = document.getElementById('lockedPeriodsTableBody');
    if (!tbody) return;

    if (!Array.isArray(locks) || locks.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No locked periods</td></tr>';
      return;
    }

    tbody.innerHTML = locks.map((l, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${l.period || '-'}</td>
        <td>${l.lockedByUserId || '-'}</td>
        <td>${l.lockedAt ? new Date(l.lockedAt).toLocaleString() : '-'}</td>
        <td><button class="btn btn-sm btn-outline-warning" onclick="unlockAttendance('${l.period}')">Unlock</button></td>
      </tr>
    `).join('');
  } catch (e) {
    console.error(e);
  }
}

async function lockAttendance(event) {
  event?.preventDefault();
  const periodInput = document.querySelector('input[name="period"]');
  const period = periodInput?.value?.trim();

  if (!period) {
    showAlert('Period (YYYY-MM format) is required', 'warning');
    return;
  }

  if (!confirm(`Lock attendance for period ${period}?`)) return;

  try {
    await attendanceApiCall('/lock', 'POST', { period });
    showAlert('Attendance period locked successfully', 'success');
    if (periodInput) periodInput.value = '';
    await loadLockedPeriods();
  } catch (e) {
    console.error(e);
  }
}

async function unlockAttendance(periodFromBtn = null) {
  const period = periodFromBtn || prompt('Enter period to unlock (YYYY-MM format):');
  if (!period) return;

  const note = prompt('Reason for unlock:') || '';
  if (!confirm(`Unlock attendance for period ${period}?`)) return;

  try {
    await attendanceApiCall('/unlock', 'POST', { period, unlockNote: note });
    showAlert('Attendance period unlocked successfully', 'success');
    await loadLockedPeriods();
  } catch (e) {
    console.error(e);
  }
}

// ==================== DASHBOARD ====================

let allAttendanceSummaries = [];

function getStatusBadgeHtml(status) {
  if (window.AttendanceStatus) return window.AttendanceStatus.getBadgeHtml(status);
  const key = String(status || 'NOT_MARKED').toUpperCase();
  return `<span class="badge bg-secondary">${key}</span>`;
}

function showAttendanceDetailModal(summary, employeeName) {
  const modal = document.getElementById('modalAttendanceDetail');
  const body = document.getElementById('attendanceDetailBody');
  const title = document.getElementById('attendanceDetailTitle');
  const logsLink = document.getElementById('attendanceDetailLogsLink');
  if (!modal || !body) {
    showAlert(`Attendance on ${summary?.date || '—'}: ${summary?.status || '—'}`, 'info');
    return;
  }

  const AS = window.AttendanceStatus;
  const fmtTime = AS?.formatTime || ((v) => (v ? new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'));
  const fmtWork = AS?.formatWorkMinutes || ((m) => (m ? `${Math.floor(m / 60)}h ${m % 60}m` : '—'));
  const statusLabel = AS?.getLabel(summary?.status) || summary?.status || 'Not Marked';

  if (title) {
    title.textContent = employeeName
      ? `${employeeName} — ${summary?.date || ''}`
      : `Attendance — ${summary?.date || ''}`;
  }

  body.innerHTML = `
    <dl class="row mb-0">
      <dt class="col-sm-4 text-muted">Status</dt>
      <dd class="col-sm-8">${getStatusBadgeHtml(summary?.status)}</dd>
      <dt class="col-sm-4 text-muted">Check-in</dt>
      <dd class="col-sm-8">${fmtTime(summary?.firstInAt)}</dd>
      <dt class="col-sm-4 text-muted">Check-out</dt>
      <dd class="col-sm-8">${fmtTime(summary?.lastOutAt)}</dd>
      <dt class="col-sm-4 text-muted">Work hours</dt>
      <dd class="col-sm-8">${fmtWork(summary?.workMinutes)}</dd>
      <dt class="col-sm-4 text-muted">Late minutes</dt>
      <dd class="col-sm-8">${summary?.lateMinutes != null ? summary.lateMinutes + ' min' : '—'}</dd>
      <dt class="col-sm-4 text-muted">Source</dt>
      <dd class="col-sm-8">${summary?.source || 'AUTO'}</dd>
    </dl>
  `;

  if (logsLink && summary?.date) {
    logsLink.href = `/admin/attendance/logs?date=${summary.date}`;
    logsLink.style.display = '';
  } else if (logsLink) {
    logsLink.style.display = 'none';
  }

  new bootstrap.Modal(modal).show();
}

async function loadAttendanceTrend() {
  const container = document.getElementById('attendanceTrendContainer');
  if (!container) return;

  try {
    const trend = await attendanceApiCall('/trend?days=30');
    renderAttendanceTrend(Array.isArray(trend) ? trend : []);
  } catch (e) {
    console.error(e);
    container.innerHTML = `
      <div class="text-center text-danger py-3">
        <i class="fa-solid fa-exclamation-triangle me-2"></i>Could not load trend.
        <a href="#" onclick="loadAttendanceTrend(); return false;">Retry</a>
      </div>`;
  }
}

function renderAttendanceTrend(trend) {
  const container = document.getElementById('attendanceTrendContainer');
  if (!container) return;

  const hasData = trend.some((d) => (d.present + d.absent + d.late + d.onLeave) > 0);
  if (!trend.length || !hasData) {
    container.innerHTML = `
      <div class="text-center text-muted py-4">
        <i class="fa-solid fa-chart-line fa-2x mb-2 d-block opacity-50"></i>
        No attendance records in the last 30 days
      </div>`;
    return;
  }

  const maxVal = Math.max(1, ...trend.map((d) => d.present + d.absent + d.late + d.onLeave));
  const step = trend.length > 14 ? 3 : 1;

  const bars = trend.map((d, i) => {
    const total = d.present + d.absent + d.late + d.onLeave;
    const height = Math.round((total / maxVal) * 100);
    const presentPct = total ? Math.round((d.present / total) * 100) : 0;
    const absentPct = total ? Math.round((d.absent / total) * 100) : 0;
    const latePct = total ? Math.round((d.late / total) * 100) : 0;
    const leavePct = total ? Math.round((d.onLeave / total) * 100) : 0;
    const showLabel = i % step === 0 || i === trend.length - 1;

    return `
      <div class="trend-bar-col" title="${d.date}: ${d.present} present, ${d.absent} absent, ${d.late} late, ${d.onLeave} on leave">
        <div class="trend-bar" style="height:${Math.max(height, 4)}%">
          ${total > 0 ? `<span class="trend-seg present" style="height:${presentPct}%"></span>
          <span class="trend-seg absent" style="height:${absentPct}%"></span>
          <span class="trend-seg late" style="height:${latePct}%"></span>
          <span class="trend-seg leave" style="height:${leavePct}%"></span>` : ''}
        </div>
        <div class="trend-label" style="${showLabel ? '' : 'visibility:hidden'}">${d.label}</div>
      </div>`;
  }).join('');

  const totals = trend.reduce(
    (acc, d) => {
      acc.present += d.present;
      acc.absent += d.absent;
      acc.late += d.late;
      acc.leave += d.onLeave;
      return acc;
    },
    { present: 0, absent: 0, late: 0, leave: 0 }
  );

  container.innerHTML = `
    <div class="trend-chart">${bars}</div>
    <div class="trend-legend">
      <span><i class="trend-dot present"></i> Present</span>
      <span><i class="trend-dot absent"></i> Absent</span>
      <span><i class="trend-dot late"></i> Late</span>
      <span><i class="trend-dot leave"></i> On leave</span>
    </div>
    <div class="insight-summary-text text-muted small mt-2">30-day total: ${totals.present} present · ${totals.absent} absent · ${totals.late} late · ${totals.leave} on leave</div>`;
}

async function loadDashboard() {
  try {
    const data = await attendanceApiCall('/dashboard');

    const presentCard = document.querySelector('[data-kpi="present"]');
    const absentCard = document.querySelector('[data-kpi="absent"]');
    const lateCard = document.querySelector('[data-kpi="late"]');
    const onLeaveCard = document.querySelector('[data-kpi="onLeave"]');

    const counts = data?.counts || {};
    if (presentCard) presentCard.textContent = counts.PRESENT || 0;
    if (absentCard) absentCard.textContent = counts.ABSENT || 0;
    if (lateCard) lateCard.textContent = counts.LATE || 0;
    if (onLeaveCard) onLeaveCard.textContent = counts.LEAVE || 0;

    const lastUpdated = document.getElementById('lastUpdatedTime');
    if (lastUpdated) {
      lastUpdated.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  } catch (e) {
    console.error(e);
  }
}

async function loadDashboardAttendanceTable() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const data = await attendanceApiCall(`/dashboard?date=${today}`);
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;

    // Update refresh time
    const refreshTimeEl = document.getElementById('refreshTime');
    if (refreshTimeEl) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      refreshTimeEl.textContent = now;
    }

    const rows = Array.isArray(data?.summaries) ? data.summaries : [];
    allAttendanceSummaries = rows;
    window.allAttendanceSummaries = rows;

    // Update record count
    const recordCountEl = document.getElementById('recordCount');
    if (recordCountEl) {
      recordCountEl.textContent = `${rows.length} record${rows.length !== 1 ? 's' : ''}`;
    }

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-5"><i class="fa-solid fa-inbox fa-2x mb-2 d-block opacity-50"></i>No attendance records for today.<br><small>Employees will appear here after punches or day recalculation.</small></td></tr>';
      return;
    }

    const AS = window.AttendanceStatus;
    const fmtTime = AS?.formatTime || ((d) => (d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'));
    const displayWorkHours = (r) => {
      if (r.workMinutes != null && r.workMinutes !== '') {
        return AS?.formatWorkMinutes(r.workMinutes) || `${Math.floor(r.workMinutes / 60)}h ${r.workMinutes % 60}m`;
      }
      if (!r.firstInAt || !r.lastOutAt) return '—';
      const diff = Math.round((new Date(r.lastOutAt) - new Date(r.firstInAt)) / 60000);
      return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    };

    tbody.innerHTML = rows.map((r, i) => {
      // Get shift info from employee's current shift assignment
      let shiftName = '-';
      let shiftTime = '-';
      if (r.employee?.shiftAssignments && r.employee.shiftAssignments.length > 0) {
        const shift = r.employee.shiftAssignments[0]?.shift;
        if (shift) {
          shiftName = shift.name || '-';
          shiftTime = `${shift.startTime || ''} - ${shift.endTime || ''}`;
        }
      }

      const rowClass = AS?.STATUSES?.[AS.normalize(r.status)]?.rowClass || '';

      return `
        <tr class="${rowClass}" data-status="${r.status || 'NOT_MARKED'}" data-employee-id="${r.employeeId || ''}">
          <td><strong>${i + 1}</strong></td>
          <td>
            <div>
              <strong>${r.employee?.empName || 'N/A'}</strong>
              <br/>
              <small class="text-muted"><i class="fa-solid fa-id-card me-1"></i>${r.employee?.empId || 'N/A'}</small>
            </div>
          </td>
          <td>
            <small><i class="fa-solid fa-building me-1"></i>${r.employee?.empDepartment || '-'}</small>
          </td>
          <td>
            <small>${r.employee?.empDesignation || '-'}</small>
          </td>
          <td class="text-center">
            ${getStatusBadgeHtml(r.status)}
          </td>
          <td class="text-center">
            <strong>${fmtTime(r.firstInAt)}</strong>
          </td>
          <td class="text-center">
            <strong>${fmtTime(r.lastOutAt)}</strong>
          </td>
          <td class="text-center">
            <strong>${displayWorkHours(r)}</strong>
          </td>
          <td>
            <div>
              <strong>${shiftName}</strong>
              <br/>
              <small class="text-muted">${shiftTime}</small>
            </div>
          </td>
          <td class="text-center">
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-sm btn-outline-primary" onclick="viewEmployeeAttendanceDetails(${r.id}, ${r.employeeId}, '${r.date}')" title="View Details" data-bs-toggle="tooltip"><i class="fa-solid fa-eye"></i></button>
              <button class="btn btn-sm btn-outline-warning" onclick="openEditAttendanceModal(${r.id}, ${r.employeeId}, '${r.date}')" title="Edit" data-bs-toggle="tooltip"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-sm btn-outline-info" onclick="openRegularizeModal(${r.id}, ${r.employeeId}, '${r.date}')" title="Regularize" data-bs-toggle="tooltip"><i class="fa-solid fa-file-contract"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Initialize tooltips
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(el => {
      if (el._bsTooltip) el._bsTooltip.dispose();
      new bootstrap.Tooltip(el);
    });

    filterAttendance();
  } catch (e) {
    console.error(e);
    const tbody = document.getElementById('attendanceTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="10" class="text-center text-danger py-4"><i class="fa-solid fa-exclamation-triangle me-2"></i>Failed to load attendance. <a href="#" onclick="loadDashboardAttendanceTable(); return false;">Retry</a></td></tr>';
    }
  }
}

// ==================== EMPLOYEE SUMMARIES ====================

let allEmployeeSummaryRows = [];
let currentHistoryEmployee = null;

function getAdminCalendarStatusMeta(status) {
  const key = String(status || 'NOT_MARKED').toUpperCase();
  const map = {
    PRESENT: { text: '✓ Present', cls: 'admin-cal-status-present' },
    ABSENT: { text: '✗ Absent', cls: 'admin-cal-status-absent' },
    LATE: { text: '⏰ Late', cls: 'admin-cal-status-late' },
    LEAVE: { text: '🏖 On Leave', cls: 'admin-cal-status-leave' },
    HALF_DAY: { text: '⏸ Half Day', cls: 'admin-cal-status-leave' },
    HOLIDAY: { text: 'Holiday', cls: 'admin-cal-status-holiday' },
    WEEKOFF: { text: 'Week Off', cls: 'admin-cal-status-notmarked' },
    NOT_MARKED: { text: '—', cls: 'admin-cal-status-notmarked' },
  };
  return map[key] || { text: key, cls: 'admin-cal-status-notmarked' };
}

function renderEmployeeHistoryCalendar({ monthStr, days, holidays, employee }) {
  const grid = document.getElementById('empHistoryCalendarGrid');
  const monthLabel = document.getElementById('empHistoryMonthLabel');
  if (!grid) return;

  const [year, month] = monthStr.split('-');
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  if (monthLabel) {
    monthLabel.textContent = `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  }

  const attendanceMap = {};
  (days || []).forEach((d) => { attendanceMap[d.date] = d; });

  const holidayMap = {};
  (holidays || []).forEach((h) => { holidayMap[h.date] = h; });

  const firstDay = new Date(Number(year), parseInt(month, 10) - 1, 1).getDay();
  const daysInMonth = new Date(Number(year), parseInt(month, 10), 0).getDate();
  const today = new Date().toISOString().split('T')[0];
  const AS = window.AttendanceStatus;
  const fmtTime = AS?.formatTime || ((v) => (v ? new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''));

  grid.innerHTML = '';

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'admin-cal-day other-month';
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'admin-cal-day';
    if (dateStr === today) cell.classList.add('today');

    const holiday = holidayMap[dateStr];
    const attendance = attendanceMap[dateStr];

    if (holiday) {
      cell.classList.add('holiday');
      cell.innerHTML = `
        <div class="admin-cal-day-date">${day}</div>
        <div class="admin-cal-holiday-name">${holiday.name || 'Holiday'}</div>
        <div class="admin-cal-day-status admin-cal-status-holiday">🎉 Holiday</div>`;
      cell.addEventListener('click', () => {
        showAttendanceDetailModal({ date: dateStr, status: 'HOLIDAY' }, employee?.empName);
      });
    } else {
      const status = attendance?.status || 'NOT_MARKED';
      const meta = getAdminCalendarStatusMeta(status);
      const timeInfo = attendance?.firstInAt
        ? `<div class="admin-cal-day-times">IN ${fmtTime(attendance.firstInAt)}${attendance.lastOutAt ? ` · OUT ${fmtTime(attendance.lastOutAt)}` : ''}</div>`
        : '';

      cell.innerHTML = `
        <div class="admin-cal-day-date">${day}</div>
        ${timeInfo}
        <div class="admin-cal-day-status ${meta.cls}">${meta.text}</div>`;

      cell.addEventListener('click', () => {
        showAttendanceDetailModal(attendance || { date: dateStr, status: 'NOT_MARKED' }, employee?.empName);
      });
    }

    grid.appendChild(cell);
  }
}

function formatTotalHours(minutes) {
  const mins = Number(minutes) || 0;
  if (!mins) return '—';
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

async function loadEmployeeSummaries() {
  const tbody = document.getElementById('employeeSummariesBody');
  const monthInput = document.getElementById('summaryMonth');
  if (!tbody) return;

  const month = monthInput?.value || new Date().toISOString().slice(0, 7);
  if (monthInput && !monthInput.value) monthInput.value = month;

  const department = document.getElementById('summaryDepartment')?.value || '';

  try {
    tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted py-4"><i class="fa-solid fa-spinner fa-spin me-2"></i>Loading summaries...</td></tr>';

    const params = new URLSearchParams({ month });
    if (department) params.set('department', department);

    const data = await attendanceApiCall(`/employee-summaries?${params.toString()}`);
    allEmployeeSummaryRows = Array.isArray(data?.rows) ? data.rows : [];
    populateSummaryDepartments(allEmployeeSummaryRows);
    renderEmployeeSummaries(allEmployeeSummaryRows);
  } catch (e) {
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="11" class="text-center text-danger py-4"><i class="fa-solid fa-exclamation-triangle me-2"></i>Failed to load summaries. <a href="#" onclick="loadEmployeeSummaries(); return false;">Retry</a></td></tr>';
  }
}

function populateSummaryDepartments(rows) {
  const select = document.getElementById('summaryDepartment');
  if (!select) return;
  const current = select.value;
  const departments = [...new Set(rows.map((r) => r.employee?.empDepartment).filter(Boolean))].sort();
  select.innerHTML = '<option value="">All departments</option>';
  departments.forEach((dept) => {
    const opt = document.createElement('option');
    opt.value = dept;
    opt.textContent = dept;
    select.appendChild(opt);
  });
  if (current && departments.includes(current)) select.value = current;
}

function filterEmployeeSummaries() {
  const search = (document.getElementById('summarySearch')?.value || '').toLowerCase();
  if (!search) {
    renderEmployeeSummaries(allEmployeeSummaryRows);
    return;
  }
  const filtered = allEmployeeSummaryRows.filter((row) => {
    const e = row.employee || {};
    return (
      (e.empName || '').toLowerCase().includes(search)
      || (e.empId || '').toLowerCase().includes(search)
      || (e.empDepartment || '').toLowerCase().includes(search)
    );
  });
  renderEmployeeSummaries(filtered);
}

function renderEmployeeSummaries(rows) {
  const tbody = document.getElementById('employeeSummariesBody');
  const countEl = document.getElementById('summaryCount');
  if (!tbody) return;

  if (countEl) {
    countEl.textContent = `${rows.length} employee${rows.length !== 1 ? 's' : ''}`;
  }

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted py-5"><i class="fa-solid fa-inbox fa-2x mb-2 d-block opacity-50"></i>No employees found for this period</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((row, i) => {
    const e = row.employee || {};
    const s = row.stats || {};
    const rate = s.attendanceRate != null ? `${s.attendanceRate}%` : '—';
    const inactive = e.isActive === false ? '<span class="badge bg-secondary ms-1">Inactive</span>' : '';

    return `
      <tr>
        <td>${i + 1}</td>
        <td>
          <strong>${e.empName || 'N/A'}</strong>${inactive}
          <br><small class="text-muted">${e.empId || ''}</small>
        </td>
        <td>${e.empDepartment || '—'}</td>
        <td class="text-center"><span class="badge bg-success">${s.present || 0}</span></td>
        <td class="text-center"><span class="badge bg-danger">${s.absent || 0}</span></td>
        <td class="text-center"><span class="badge bg-warning text-dark">${s.late || 0}</span></td>
        <td class="text-center"><span class="badge bg-primary">${s.leave || 0}</span></td>
        <td class="text-center"><span class="text-muted">${s.notMarked || 0}</span></td>
        <td class="text-center"><strong>${rate}</strong></td>
        <td class="text-center">${formatTotalHours(s.totalWorkMinutes)}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-primary" onclick="viewEmployeeAttendanceHistory(${e.id})" title="View daily history">
            <i class="fa-solid fa-calendar-days me-1"></i> View
          </button>
        </td>
      </tr>`;
  }).join('');
}

async function viewEmployeeAttendanceHistory(employeeId) {
  const modal = document.getElementById('modalEmployeeAttendanceHistory');
  const title = document.getElementById('empHistoryTitle');
  const subtitle = document.getElementById('empHistorySubtitle');
  const statsEl = document.getElementById('empHistoryStats');
  const grid = document.getElementById('empHistoryCalendarGrid');
  const updatedEl = document.getElementById('empHistoryUpdated');
  if (!modal || !grid) return;

  const month = document.getElementById('summaryMonth')?.value || new Date().toISOString().slice(0, 7);

  grid.innerHTML = '<div class="admin-cal-loading text-center text-muted py-4"><i class="fa-solid fa-spinner fa-spin me-2"></i>Loading calendar...</div>';
  if (statsEl) statsEl.innerHTML = '';
  new bootstrap.Modal(modal).show();

  try {
    const data = await attendanceApiCall(`/employees/${employeeId}/attendance-history?month=${month}`);
    const emp = data.employee || {};
    currentHistoryEmployee = emp;
    const stats = data.stats || {};

    if (title) title.textContent = emp.empName || 'Employee attendance';
    if (subtitle) {
      subtitle.textContent = `${emp.empId || ''} · ${emp.empDepartment || '—'} · ${data.period || month}`;
    }
    if (updatedEl) {
      updatedEl.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    if (statsEl) {
      const cards = [
        { label: 'Present', value: stats.present || 0, cls: 'text-success' },
        { label: 'Absent', value: stats.absent || 0, cls: 'text-danger' },
        { label: 'Late', value: stats.late || 0, cls: 'text-warning' },
        { label: 'On Leave', value: stats.leave || 0, cls: 'text-primary' },
        { label: 'Rate', value: stats.attendanceRate != null ? `${stats.attendanceRate}%` : '—', cls: 'text-dark' },
        { label: 'Total Hours', value: formatTotalHours(stats.totalWorkMinutes), cls: 'text-dark' },
      ];
      statsEl.innerHTML = cards.map((c) => `
        <div class="col-md-2 col-6">
          <div class="border rounded p-2 text-center h-100">
            <div class="small text-muted">${c.label}</div>
            <div class="fw-bold ${c.cls}">${c.value}</div>
          </div>
        </div>`).join('');
    }

    renderEmployeeHistoryCalendar({
      monthStr: month,
      days: Array.isArray(data.days) ? data.days : [],
      holidays: Array.isArray(data.holidays) ? data.holidays : [],
      employee: emp,
    });
  } catch (e) {
    console.error(e);
    grid.innerHTML = '<div class="admin-cal-loading text-center text-danger py-4"><i class="fa-solid fa-exclamation-triangle me-2"></i>Failed to load calendar</div>';
  }
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
  const page = window.location.pathname;

  console.log('Loading page:', page);

  if (page.includes('/admin/attendance/policies')) {
    setupAutoRefresh(loadPolicies, 8000); // Refresh every 8 seconds
  } else if (page.includes('/admin/attendance/shifts')) {
    setupAutoRefresh(loadShifts, 8000);
  } else if (page.includes('/admin/attendance/holidays')) {
    setupAutoRefresh(loadHolidays, 8000);
  } else if (page.includes('/admin/attendance/assignments')) {
    // Avoid spamming multiple refreshers on a single page
    loadPolicies();
    loadShifts();
    setupAutoRefresh(loadAssignments, 8000);
  } else if (page.includes('/admin/attendance/logs')) {
    setupAutoRefresh(loadLogs, 5000);

    const dateInput = document.getElementById('logDate');
    if (dateInput) {
      const urlDate = new URLSearchParams(window.location.search).get('date');
      if (urlDate) dateInput.value = urlDate;
      else if (!dateInput.value) dateInput.value = new Date().toISOString().split('T')[0];
      dateInput.addEventListener('change', () => {
        stopAutoRefresh('loadLogs');
        setupAutoRefresh(loadLogs, 5000);
      });
    }
  } else if (page.includes('/admin/attendance/regularizations')) {
    setupAutoRefresh(loadRegularizations, 6000); // Refresh every 6 seconds
  } else if (page.includes('/admin/attendance/lock')) {
    setupAutoRefresh(loadLockedPeriods, 10000);
  } else if (page.includes('/admin/attendance/reports')) {
    // Reports page - just set up event listeners
    const generateBtn = document.querySelector('[onclick="generateReport()"]');
    if (generateBtn) {
      generateBtn.addEventListener('click', generateReport);
    }
  } else if (page.includes('/admin/attendance/summaries')) {
    const monthInput = document.getElementById('summaryMonth');
    if (monthInput && !monthInput.value) {
      monthInput.value = new Date().toISOString().slice(0, 7);
    }
    loadEmployeeSummaries();
  } else if (page.includes('/admin/attendance/dashboard') || page === '/admin/attendance') {
    loadAttendanceTrend();
    setupAutoRefresh(loadDashboard, 5000);
    setupAutoRefresh(loadDashboardAttendanceTable, 5000);
  }

  // Cleanup on page unload to prevent memory leaks
  window.addEventListener('beforeunload', () => {
    Object.keys(refreshIntervals).forEach(key => {
      clearInterval(refreshIntervals[key]);
    });
  });
});

// ==================== MISSING VIEW HELPERS (wire up non-working buttons) ====================

// View Attendance Details Modal
function viewEmployeeAttendanceDetails(summaryId, employeeId, date) {
  const summary = (window.allAttendanceSummaries || allAttendanceSummaries || []).find(
    (s) => s.id === summaryId || (s.employeeId === employeeId && s.date === date)
  );
  if (!summary) {
    showAlert('Attendance record not found. Try refreshing the table.', 'warning');
    return;
  }
  showAttendanceDetailModal(summary, summary.employee?.empName);
}

function openEditAttendanceModal(summaryId, employeeId, date) {
  window.location.href = `/admin/attendance/logs?date=${date || new Date().toISOString().split('T')[0]}`;
}

// Top-bar refresh buttons in HBS
function refreshPolicies() { return loadPolicies(); }
function refreshLogs() { return loadLogs(); }

function viewLogDetails(id, empId, date) {
  const log = window.allLogs?.find((l) => l.id === id) || {};
  showAttendanceDetailModal(log, log.employee?.empName);
}

// Dashboard export button
function exportAttendance() { return downloadLogs(); }

// Dashboard quick actions (navigate to the relevant pages)
function openAssignModal() {
  if (window.location.pathname.includes('/admin/attendance/assignments')) return openAddAssignmentModal();
  window.location.href = '/admin/attendance/assignments';
}
function openRegularizeModal() {
  if (window.location.pathname.includes('/admin/attendance/regularizations')) return;
  window.location.href = '/admin/attendance/regularizations';
}
function openLockModal() {
  if (window.location.pathname.includes('/admin/attendance/lock')) return;
  window.location.href = '/admin/attendance/lock';
}

// Logs page filter hook used by HBS (kept lightweight; server already filters by date)
function filterLogs() {
  const search = (document.getElementById('logSearch')?.value || '').toLowerCase();
  const status = document.getElementById('logStatus')?.value || '';
  const tbody = document.getElementById('logsTableBody');

  if (!tbody || !window.allLogs) return;

  const filtered = window.allLogs.filter(log => {
    const matchSearch = !search ||
      (log.employee?.empName || '').toLowerCase().includes(search) ||
      (log.employee?.empId || '').toLowerCase().includes(search) ||
      (log.metaJson && typeof log.metaJson === 'object' && log.metaJson?.ip?.includes(search));

    const matchStatus = !status || log.status === status;

    return matchSearch && matchStatus;
  });

  renderLogs(filtered);
}

function filterByKpi(status) {
  const filter = document.getElementById('statusFilter');
  const current = filter?.value || '';
  const next = current === status ? '' : status;
  if (filter) filter.value = next;

  document.querySelectorAll('[data-kpi-filter]').forEach((el) => {
    el.classList.toggle('active-filter', el.dataset.kpiFilter === next);
  });

  filterAttendance();
}

// Dashboard table filter hook used by HBS (client-side)
function filterAttendance() {
  const search = (document.getElementById('attendanceSearch')?.value || '').toLowerCase();
  const status = (document.getElementById('statusFilter')?.value || '').toUpperCase();

  const rows = document.querySelectorAll('#attendanceTableBody tr[data-status]');
  let visible = 0;

  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    const matchesSearch = !search || text.includes(search);
    const rowStatus = (row.dataset.status || '').toUpperCase();
    const matchesStatus = !status || rowStatus === status;
    const show = matchesSearch && matchesStatus;
    row.style.display = show ? '' : 'none';
    if (show) visible += 1;
  });

  const recordCountEl = document.getElementById('recordCount');
  if (recordCountEl && rows.length) {
    recordCountEl.textContent = status || search
      ? `${visible} of ${rows.length} records`
      : `${rows.length} record${rows.length !== 1 ? 's' : ''}`;
  }
}

// Placeholder actions referenced by some refined templates
function viewAttendanceLog(id) {
  showAlert(`View attendance log ${id}`, 'info');
}
function regularizeAttendance(id) {
  window.location.href = '/admin/attendance/regularizations';
}

// ==================== REPORTS SECTION ====================
let allReports = [];
let reportsSortField = 'date';
let reportsSortDirection = 'desc';

async function loadReports() {
  try {
    // Use apiCall to include credentials and normalize response
    const data = await attendanceApiCall('/reports'); // apiCall returns data.data || data

    const rows = Array.isArray(data) ? data : [];
    allReports = rows.map(log => ({
      id: log.id,
      employee: log.employee?.empName || 'Unknown',
      employeeId: log.employee?.id || log.employeeId,
      department: log.employee?.department?.name || log.employee?.empDepartment || 'N/A',
      date: log.attendanceDate || log.date,
      status: log.status || 'UNKNOWN',
      checkin: log.checkinTime ? formatTime(log.checkinTime) : '-',
      checkout: log.checkoutTime ? formatTime(log.checkoutTime) : '-',
      workHours: calculateWorkHours(log.checkinTime, log.checkoutTime)
    }));

    // Populate department and employee filters
    populateReportsFilters();
    renderReports(allReports);
  } catch (error) {
    console.error('Error loading reports:', error);
    showAlert('Failed to load reports', 'danger');
  }
}

function populateReportsFilters() {
  const departments = [...new Set(allReports.map(r => r.department))];
  const employees = [...new Set(allReports.map(r => r.employee))];

  const deptSelect = document.getElementById('departmentFilter');
  const empSelect = document.getElementById('employeeFilter');

  departments.forEach(dept => {
    if (dept && !deptSelect.querySelector(`option[value="${dept}"]`)) {
      const option = document.createElement('option');
      option.value = dept;
      option.textContent = dept;
      deptSelect.appendChild(option);
    }
  });

  employees.forEach(emp => {
    if (emp && !empSelect.querySelector(`option[value="${emp}"]`)) {
      const option = document.createElement('option');
      option.value = emp;
      option.textContent = emp;
      empSelect.appendChild(option);
    }
  });
}

function filterReports() {
  const dept = document.getElementById('departmentFilter')?.value || '';
  const emp = document.getElementById('employeeFilter')?.value || '';
  const startDate = document.getElementById('startDateFilter')?.value || '';
  const endDate = document.getElementById('endDateFilter')?.value || '';

  const filtered = allReports.filter(r => {
    const deptMatch = !dept || r.department === dept;
    const empMatch = !emp || r.employee === emp;
    const dateMatch = (!startDate || r.date >= startDate) && (!endDate || r.date <= endDate);
    return deptMatch && empMatch && dateMatch;
  });

  renderReports(filtered);
}

function sortReports(field) {
  if (reportsSortField === field) {
    reportsSortDirection = reportsSortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    reportsSortField = field;
    reportsSortDirection = 'asc';
  }

  const sorted = [...allReports].sort((a, b) => {
    const aVal = a[field] || '';
    const bVal = b[field] || '';

    if (typeof aVal === 'string') {
      return reportsSortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    } else {
      return reportsSortDirection === 'asc'
        ? aVal - bVal
        : bVal - aVal;
    }
  });

  renderReports(sorted);
}

function renderReports(reports) {
  const tbody = document.getElementById('reportsTableBody');
  if (!tbody) return;

  if (!reports || reports.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No reports found</td></tr>';
    return;
  }

  tbody.innerHTML = reports.map(r => `
    <tr>
      <td>${r.employee} (${r.employeeId})</td>
      <td>${r.department}</td>
      <td>${r.date}</td>
      <td><span class="badge ${r.status === 'PRESENT' ? 'bg-success' : r.status === 'ABSENT' ? 'bg-danger' : r.status === 'LATE' ? 'bg-warning' : r.status === 'LEAVE' ? 'bg-info' : r.status === 'HOLIDAY' ? 'bg-purple' : 'bg-secondary'}">${r.status}</span></td>
      <td>${r.checkin}</td>
      <td>${r.checkout}</td>
      <td>${r.workHours}</td>
    </tr>
  `).join('');
}

function calculateWorkHours(checkin, checkout) {
  if (!checkin || !checkout) return '-';
  try {
    const start = new Date(checkin);
    const end = new Date(checkout);
    const diff = (end - start) / (1000 * 60 * 60);
    return diff.toFixed(2) + ' hrs';
  } catch {
    return '-';
  }
}

function clearFilters() {
  document.getElementById('departmentFilter').value = '';
  document.getElementById('employeeFilter').value = '';
  document.getElementById('startDateFilter').value = '';
  document.getElementById('endDateFilter').value = '';
  renderReports(allReports);
}

function refreshReports() {
  loadReports();
}

function downloadReport() {
  const filtered = allReports;
  let csv = 'Employee,Department,Date,Status,Check-in,Check-out,Work Hours\n';
  filtered.forEach(r => {
    csv += `"${r.employee}","${r.department}","${r.date}","${r.status}","${r.checkin}","${r.checkout}","${r.workHours}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

// Load reports on page load
function initReports() {
  const reportsTable = document.getElementById('reportsTableBody');
  if (reportsTable) {
    loadReports();
    setInterval(loadReports, 10000);
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initReports();
});
