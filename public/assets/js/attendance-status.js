/**
 * Shared attendance status labels & badges (admin + employee portals)
 */
(function (global) {
  const STATUSES = {
    PRESENT: { label: 'Present', short: 'Present', badgeClass: 'bg-success', rowClass: '', icon: 'fa-check-circle' },
    ABSENT: { label: 'Absent', short: 'Absent', badgeClass: 'bg-danger', rowClass: 'table-danger', icon: 'fa-xmark' },
    LATE: { label: 'Late', short: 'Late', badgeClass: 'bg-warning text-dark', rowClass: 'table-warning', icon: 'fa-clock' },
    HALF_DAY: { label: 'Half Day', short: 'Half Day', badgeClass: 'bg-info text-dark', rowClass: 'table-info', icon: 'fa-hourglass-half' },
    LEAVE: { label: 'On Leave', short: 'Leave', badgeClass: 'bg-primary', rowClass: 'table-info', icon: 'fa-umbrella-beach' },
    HOLIDAY: { label: 'Holiday', short: 'Holiday', badgeClass: 'bg-secondary', rowClass: '', icon: 'fa-star' },
    WEEKOFF: { label: 'Week Off', short: 'Weekoff', badgeClass: 'bg-secondary', rowClass: '', icon: 'fa-calendar-xmark' },
    NOT_MARKED: { label: 'Not Marked', short: 'Not Marked', badgeClass: 'bg-light text-muted border', rowClass: '', icon: 'fa-minus' },
  };

  function normalize(status) {
    const key = String(status || 'NOT_MARKED').toUpperCase().replace(/\s+/g, '_');
    return STATUSES[key] ? key : 'NOT_MARKED';
  }

  function getLabel(status) {
    return STATUSES[normalize(status)].label;
  }

  function getBadgeHtml(status) {
    const key = normalize(status);
    const cfg = STATUSES[key];
    if (key === 'NOT_MARKED') {
      return '<span class="text-muted">—</span>';
    }
    return `<span class="badge ${cfg.badgeClass}"><i class="fa-solid ${cfg.icon} me-1"></i>${cfg.label}</span>`;
  }

  function formatTime(value) {
    if (!value) return '—';
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatWorkMinutes(minutes) {
    if (!minutes && minutes !== 0) return '—';
    const mins = Number(minutes) || 0;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  global.AttendanceStatus = {
    STATUSES,
    normalize,
    getLabel,
    getBadgeHtml,
    formatTime,
    formatWorkMinutes,
  };
})(window);
