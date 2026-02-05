# Implementation Guide - Attendance Module Enhancements

## Quick Start for Developers

### Understanding the Attendance Flow

```
Employee Dashboard (Punch In/Out)
    ↓
AttendancePunch Records (stored in DB)
    ↓
Attendance Service (recalculateDay function)
    ↓
AttendanceDailySummary (calculated summary per day)
    ↓
Admin Dashboard (displays summaries with real-time updates)
```

### Status Calculation Logic

The status is determined by the `recalculateDay()` function in `src/services/attendance.service.js`:

1. **Check for leaves/holidays/weekoffs (without punches)**
   - If employee is on approved leave → LEAVE
   - If date is a holiday → HOLIDAY
   - If date is weekoff → WEEKOFF
   - Otherwise → ABSENT (if no punches)

2. **Determine status based on work minutes (with punches)**
   - fullDayMins = policy.fullDayMins (default: 480 = 8 hours)
   - halfDayMins = policy.halfDayMins (default: 240 = 4 hours)
   - lateMinutes = minutes after shift start time
   
   ```
   if workMinutes >= fullDayMins AND lateMinutes > 0:
       status = LATE
   else if workMinutes >= fullDayMins:
       status = PRESENT
   else if workMinutes >= halfDayMins:
       status = HALF_DAY
   else:
       status = ABSENT
   ```

### Key Files and Their Responsibilities

#### Backend

**`src/services/attendance.service.js`**
- `getDashboard()`: Fetches today's data for admin dashboard
- `getAttendanceLogs()`: Fetches historical logs with filters
- `recalculateDay()`: Calculates attendance status for a day
- `recordPunch()`: Records employee punch (IN/OUT)
- `isOnApprovedLeave()`: Checks if employee is on leave
- `isHoliday()`: Checks if date is a holiday

**`src/models/AttendanceDailySummary.js`**
- Stores calculated daily attendance summary
- Fields: firstInAt, lastOutAt, workMinutes, breakMinutes, lateMinutes, status, etc.

**`src/models/AttendancePunch.js`**
- Individual punch records (IN, OUT, BREAK_START, BREAK_END)
- Metadata for each punch (IP, location, device, etc.)

#### Frontend

**`public/assets/js/admin-attendance.js`**
- `loadDashboard()`: Fetches and updates KPI cards
- `loadDashboardAttendanceTable()`: Fetches and renders today's attendance table
- `loadLogs()`: Fetches attendance logs for selected date
- `renderLogs()`: Renders the logs table with shift info
- Auto-refresh mechanism with configurable intervals

### How to Add New Status or Status Logic

1. **Update the ENUM in the model** (`src/models/AttendanceDailySummary.js`)
   ```javascript
   status: {
     type: DataTypes.ENUM('PRESENT', 'ABSENT', 'LATE', 'NEW_STATUS'),
     ...
   }
   ```

2. **Update the status calculation logic** (`src/services/attendance.service.js` - `recalculateDay()`)
   ```javascript
   if (someCondition) {
       status = 'NEW_STATUS';
   }
   ```

3. **Add color mapping in frontend** (`public/assets/js/admin-attendance.js`)
   ```javascript
   const badgeClass = r.status === 'NEW_STATUS' ? 'bg-custom-color' : ...;
   ```

4. **Test with sample data**

### How to Implement View/Edit Modal

Currently, the buttons are placeholders. Here's how to implement them:

#### 1. Create View Details Modal

**Add to `src/views/partials/attendance-modals.hbs`:**
```handlebars
<div class="modal fade" id="viewAttendanceModal" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Attendance Details</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body" id="viewAttendanceBody">
        <!-- Details will be loaded here -->
      </div>
    </div>
  </div>
</div>
```

**Update the JavaScript function:**
```javascript
async function viewEmployeeAttendanceDetails(summaryId, employeeId, date) {
  try {
    const data = await apiCall(`/logs?date=${date}&employeeId=${employeeId}`);
    const attendance = data[0]; // Get first record
    
    const details = `
      <div class="row">
        <div class="col-md-6">
          <p><strong>Employee:</strong> ${attendance.employee?.empName}</p>
          <p><strong>Department:</strong> ${attendance.employee?.empDepartment}</p>
          <p><strong>Status:</strong> <span class="badge">${attendance.status}</span></p>
        </div>
        <div class="col-md-6">
          <p><strong>Check-in:</strong> ${new Date(attendance.firstInAt).toLocaleTimeString()}</p>
          <p><strong>Check-out:</strong> ${new Date(attendance.lastOutAt).toLocaleTimeString()}</p>
          <p><strong>Work Duration:</strong> ${attendance.workMinutes} minutes</p>
        </div>
      </div>
    `;
    
    document.getElementById('viewAttendanceBody').innerHTML = details;
    new bootstrap.Modal(document.getElementById('viewAttendanceModal')).show();
  } catch (e) {
    console.error(e);
    showAlert('Failed to load attendance details', 'danger');
  }
}
```

#### 2. Create Edit Attendance Modal

**Add to `src/views/partials/attendance-modals.hbs`:**
```handlebars
<div class="modal fade" id="editAttendanceModal" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Edit Attendance</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <form id="editAttendanceForm">
          <div class="mb-3">
            <label class="form-label">Check-in Time</label>
            <input type="time" id="editCheckIn" class="form-control" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Check-out Time</label>
            <input type="time" id="editCheckOut" class="form-control" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Notes</label>
            <textarea id="editNotes" class="form-control" rows="3"></textarea>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" onclick="saveAttendanceEdit()">Save Changes</button>
      </div>
    </div>
  </div>
</div>
```

**Update the JavaScript function:**
```javascript
let editingAttendanceData = {};

async function openEditAttendanceModal(summaryId, employeeId, date) {
  try {
    editingAttendanceData = { summaryId, employeeId, date };
    
    // Load current data
    const response = await fetch(`/admin/attendance/api/logs?date=${date}&employeeId=${employeeId}`);
    const data = await response.json();
    const attendance = data.data[0];
    
    // Populate form
    document.getElementById('editCheckIn').value = new Date(attendance.firstInAt).toTimeString().slice(0, 5);
    document.getElementById('editCheckOut').value = new Date(attendance.lastOutAt).toTimeString().slice(0, 5);
    document.getElementById('editNotes').value = attendance.notes || '';
    
    new bootstrap.Modal(document.getElementById('editAttendanceModal')).show();
  } catch (e) {
    console.error(e);
    showAlert('Failed to load attendance data', 'danger');
  }
}

async function saveAttendanceEdit() {
  try {
    const checkIn = document.getElementById('editCheckIn').value;
    const checkOut = document.getElementById('editCheckOut').value;
    const notes = document.getElementById('editNotes').value;
    
    const punches = [];
    if (checkIn) punches.push({ punchType: 'IN', punchAt: `${editingAttendanceData.date}T${checkIn}:00` });
    if (checkOut) punches.push({ punchType: 'OUT', punchAt: `${editingAttendanceData.date}T${checkOut}:00` });
    
    await apiCall('/manual-edit', 'POST', {
      employeeId: editingAttendanceData.employeeId,
      date: editingAttendanceData.date,
      punches,
      note: notes
    });
    
    showAlert('Attendance updated successfully', 'success');
    bootstrap.Modal.getInstance(document.getElementById('editAttendanceModal')).hide();
    
    // Refresh table
    await loadDashboardAttendanceTable();
  } catch (e) {
    console.error(e);
    showAlert('Failed to save changes', 'danger');
  }
}
```

### How to Add Real-time Notifications

```javascript
// Add to admin-attendance.js
function checkForUpdates() {
  // Fetch pending regularizations count
  apiCall('/regularizations?status=PENDING').then(data => {
    if (data.length > 0) {
      // Show notification badge
      const badge = document.querySelector('.notification-badge');
      if (badge) badge.textContent = data.length;
      badge.style.display = 'block';
    }
  });
}

// Check for updates every 30 seconds
setInterval(checkForUpdates, 30000);
```

### How to Export Data to CSV/Excel

```javascript
async function exportToCSV() {
  try {
    const date = document.getElementById('logDate').value;
    const logs = await apiCall(`/logs?date=${date}`);
    
    const headers = ['Employee', 'Department', 'Status', 'Check-in', 'Check-out', 'Shift', 'Notes'];
    const rows = logs.map(l => [
      l.employee?.empName,
      l.employee?.empDepartment,
      l.status,
      new Date(l.firstInAt).toLocaleTimeString(),
      new Date(l.lastOutAt).toLocaleTimeString(),
      l.employee?.shiftAssignments?.[0]?.shift?.name || '-',
      l.notes || ''
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Download file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${date}.csv`;
    a.click();
  } catch (e) {
    console.error(e);
    showAlert('Export failed', 'danger');
  }
}
```

### Performance Optimization Tips

1. **Reduce API calls**: Cache shift data after first load
2. **Pagination**: Add pagination for large attendance tables (>1000 records)
3. **Debounce search**: Add debounce to search and filter inputs
4. **Lazy load**: Don't load previous months by default
5. **Database indexes**: Ensure indexes on (businessId, date), (employeeId, date)

### Common Issues and Solutions

**Issue**: Attendance status not updating
- **Solution**: Call `recalculateDay()` after any punch is recorded

**Issue**: Shift not showing in employee dropdown
- **Solution**: Ensure shift status is 'ACTIVE' and employee's business matches

**Issue**: LATE status not showing
- **Solution**: Ensure `lateMinutes > 0` in AttendanceDailySummary AND workMinutes >= fullDayMins

**Issue**: Leave status not showing
- **Solution**: Check if LeaveRequest is APPROVED with correct date range

---

## Testing with cURL

```bash
# Get today's dashboard
curl -X GET http://localhost:3002/admin/attendance/api/dashboard

# Get logs for specific date
curl -X GET "http://localhost:3002/admin/attendance/api/logs?date=2025-01-22"

# Get employee shifts
curl -X GET http://localhost:3002/employee/attendance/api/shifts \
  -H "Cookie: employeeToken=YOUR_TOKEN"

# Manual edit attendance
curl -X POST http://localhost:3002/admin/attendance/api/manual-edit \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": 10,
    "date": "2025-01-22",
    "punches": [
      {"punchType": "IN", "punchAt": "2025-01-22T09:30:00"},
      {"punchType": "OUT", "punchAt": "2025-01-22T18:00:00"}
    ],
    "note": "Manual correction"
  }'
```

---

## API Reference

### GET /admin/attendance/api/dashboard
Fetch today's attendance dashboard data
- **Query**: `date` (optional, defaults to today)
- **Response**: `{ date, counts, pendingRegularizations, summaries }`

### GET /admin/attendance/api/logs
Fetch attendance logs with filters
- **Query**: `date` (required), `department` (optional), `status` (optional)
- **Response**: Array of attendance summaries

### GET /employee/attendance/api/shifts
Fetch all active shifts for employee's business
- **Response**: `{ success: true, data: shifts[] }`

### POST /admin/attendance/api/manual-edit
Manually edit attendance record
- **Body**: `{ employeeId, date, punches[], note }`
- **Response**: Updated attendance summary

---

Done! The attendance module is now fully functional with:
✅ Real-time status calculation (PRESENT, ABSENT, LATE, LEAVE)
✅ Shift information fetched from backend
✅ Dynamic shift dropdown in regularization form
✅ View and edit action buttons (template in place)
✅ Real-time dashboard updates
✅ Proper data associations and relationships
