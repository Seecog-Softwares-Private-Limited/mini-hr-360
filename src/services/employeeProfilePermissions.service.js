import { getRolePermissions } from '../middleware/roleMiddleware.js';

export const PROFILE_TAB_IDS = [
  'profile',
  'job',
  'salary',
  'bank',
  'statutory',
  'documents',
  'attendance',
  'leave',
  'payroll',
  'assets',
  'performance',
  'timeline',
  'exit',
];

const FINANCIAL_TABS = new Set(['salary', 'bank', 'statutory', 'payroll']);

export function getEmployeeProfilePermissions(user) {
  const perms = getRolePermissions(user?.role);
  const canViewFinancial = Boolean(perms.canAccessPayroll || perms.canAccessFinance);
  const canEditFinancial = Boolean(perms.canAccessPayroll);
  const canManageEmployees = Boolean(perms.canAccessEmployees);

  const hiddenTabs = canViewFinancial
    ? []
    : [...FINANCIAL_TABS];

  const visibleTabs = PROFILE_TAB_IDS.filter((tab) => !hiddenTabs.includes(tab));

  return {
    role: user?.role || null,
    visibleTabs,
    hiddenTabs,
    canViewFinancial,
    canEditFinancial,
    canEditJob: canManageEmployees,
    canEditAssets: canManageEmployees,
    canViewPayroll: canViewFinancial,
  };
}

export function canAccessProfileTab(user, tab) {
  const perms = getEmployeeProfilePermissions(user);
  return perms.visibleTabs.includes(tab);
}

export function assertProfileTabAccess(user, tab) {
  if (!canAccessProfileTab(user, tab)) {
    const err = new Error('You do not have permission to view this profile section');
    err.statusCode = 403;
    throw err;
  }
}

export function assertProfileFinancialEdit(user) {
  const perms = getEmployeeProfilePermissions(user);
  if (!perms.canEditFinancial) {
    const err = new Error('You do not have permission to edit financial profile data');
    err.statusCode = 403;
    throw err;
  }
}

export function assertProfileEmployeeEdit(user) {
  const perms = getEmployeeProfilePermissions(user);
  if (!perms.canEditJob) {
    const err = new Error('You do not have permission to edit employee profile data');
    err.statusCode = 403;
    throw err;
  }
}
