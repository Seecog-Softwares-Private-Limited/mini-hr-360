/** Default offboarding clearance checklist items */
export const DEFAULT_OFFBOARDING_CHECKLIST = [
  { key: 'resignation_accepted', label: 'Resignation acceptance letter issued', department: 'HR', done: false },
  { key: 'manager_clearance', label: 'Reporting manager clearance', department: 'Manager', done: false },
  { key: 'it_assets', label: 'IT assets returned (laptop, access card)', department: 'IT', done: false },
  { key: 'email_access', label: 'Email & system access revoked', department: 'IT', done: false },
  { key: 'finance_dues', label: 'Finance dues / advances cleared', department: 'Finance', done: false },
  { key: 'no_dues_form', label: 'No-dues clearance form signed', department: 'HR', done: false },
  { key: 'fnf_processed', label: 'Full & final settlement processed', department: 'Finance', done: false },
  { key: 'relieving_letter', label: 'Relieving / experience letter issued', department: 'HR', done: false },
];

export const INTERN_OFFBOARDING_CHECKLIST = [
  { key: 'internship_cert', label: 'Internship completion certificate issued', department: 'HR', done: false },
  { key: 'it_assets', label: 'IT assets returned', department: 'IT', done: false },
  { key: 'manager_feedback', label: 'Supervisor feedback recorded', department: 'Manager', done: false },
];

/** Notify these user roles when a department checklist item is completed */
export const DEPARTMENT_NOTIFY_ROLES = {
  HR: 'HR_MANAGER',
  Manager: 'MANAGER',
  IT: 'HR_EXECUTIVE',
  Finance: 'FINANCE',
};

export function getDefaultChecklistForType(employeeType) {
  return employeeType === 'Intern'
    ? INTERN_OFFBOARDING_CHECKLIST.map((i) => ({ ...i }))
    : DEFAULT_OFFBOARDING_CHECKLIST.map((i) => ({ ...i }));
}

export function mergeChecklist(stored, employeeType) {
  const defaults = getDefaultChecklistForType(employeeType);
  if (!stored || !Array.isArray(stored) || stored.length === 0) return defaults;

  const byKey = new Map(stored.map((i) => [i.key, i]));
  return defaults.map((d) => ({
    ...d,
    done: Boolean(byKey.get(d.key)?.done),
    completedAt: byKey.get(d.key)?.completedAt || null,
    notes: byKey.get(d.key)?.notes || '',
  }));
}

export function checklistProgress(items) {
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}
