import { Business, OrganizationMember, User } from '../models/index.js';

/** Canonical portal roles (lowercase snake for permission map keys). */
export const PORTAL_ROLES = {
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  HR_MANAGER: 'hr_manager',
  ADMIN: 'admin',
  OWNER: 'owner',
};

/**
 * Central permission map — extend here for new roles (Finance, Recruiter, etc.).
 * Patterns: exact key, namespace wildcard (`team.*`), or global `*`.
 */
export const ROLE_PERMISSIONS = {
  [PORTAL_ROLES.EMPLOYEE]: [
    'self.dashboard',
    'self.attendance',
    'self.leave',
    'self.payslips',
    'self.documents',
    'self.profile',
    'self.notifications',
  ],
  [PORTAL_ROLES.MANAGER]: [
    'self.*',
    'team.dashboard',
    'team.attendance',
    'team.leave',
    'team.corrections',
    'team.reports',
    'leave.approve',
    'attendance.approve',
  ],
  [PORTAL_ROLES.HR_MANAGER]: [
    'self.*',
    'employees.records',
    'employees.onboarding',
    'employees.offboarding',
    'attendance.manage',
    'leave.manage',
    'payroll.view',
    'payroll.generate',
    'documents.manage',
    'holidays.manage',
    'shifts.manage',
    'reports.hr',
  ],
  [PORTAL_ROLES.ADMIN]: [
    'self.*',
    'employees.manage',
    'users.manage',
    'departments.manage',
    'designations.manage',
    'attendance.monitor',
    'leave.monitor',
    'reports.admin',
    'announcements.manage',
    'organization.settings',
  ],
  [PORTAL_ROLES.OWNER]: ['*'],
};

/** Navigation definition — filtered by role permissions at runtime. */
export const PORTAL_NAV_SECTIONS = [
  {
    id: 'self',
    items: [
      { key: 'dashboard', label: 'Dashboard', href: '/employee/dashboard', icon: 'fa-house', permission: 'self.dashboard' },
    ],
  },
  {
    id: 'my_work',
    title: 'My Work',
    toggleIcon: 'fa-briefcase',
    toggleLabel: 'My Work',
    submenuId: 'empNavMyWork',
    items: [
      { key: 'attendance', label: 'My Attendance', href: '/employee/attendance/today', icon: 'fa-fingerprint', permission: 'self.attendance' },
      { key: 'leaves', label: 'Leaves', href: '/employee/leaves', icon: 'fa-calendar-days', permission: 'self.leave' },
    ],
  },
  {
    id: 'team',
    title: 'Team Management',
    toggleIcon: 'fa-users',
    toggleLabel: 'Team Management',
    submenuId: 'empNavTeam',
    sectionPermission: 'team.dashboard',
    items: [
      { key: 'team_dashboard', label: 'Team Dashboard', href: '/employee/team', icon: 'fa-chart-pie', permission: 'team.dashboard' },
      { key: 'team_attendance', label: 'Team Attendance', href: '/employee/team/attendance', icon: 'fa-user-clock', permission: 'team.attendance' },
      { key: 'team_leave', label: 'Team Leave Requests', href: '/employee/team/leaves', icon: 'fa-calendar-check', permission: 'team.leave' },
      { key: 'team_corrections', label: 'Attendance Corrections', href: '/employee/team/corrections', icon: 'fa-pen-to-square', permission: 'team.corrections' },
      { key: 'team_reports', label: 'Team Reports', href: '/employee/team/reports', icon: 'fa-chart-column', permission: 'team.reports' },
    ],
  },
  {
    id: 'payroll_self',
    title: 'Payroll',
    toggleIcon: 'fa-wallet',
    toggleLabel: 'Payroll',
    submenuId: 'empNavPayroll',
    items: [
      { key: 'payslips', label: 'Payslips', href: '/employee/payroll/payslips', permission: 'self.payslips' },
      { key: 'bank_tax', label: 'Bank & Tax', href: '/employee/payroll/bank-tax', permission: 'self.payslips' },
      { key: 'salary_details', label: 'Salary Details', href: '/employee/payroll/salary-details', permission: 'self.payslips' },
      { key: 'queries', label: 'Queries', href: '/employee/payroll/queries', permission: 'self.payslips' },
    ],
  },
  {
    id: 'hr',
    title: 'HR Operations',
    toggleIcon: 'fa-people-group',
    toggleLabel: 'HR Operations',
    submenuId: 'empNavHr',
    sectionPermission: 'employees.records',
    items: [
      { key: 'hr_employees', label: 'Employee Records', href: '/employees', icon: 'fa-id-badge', permission: 'employees.records', external: true },
      { key: 'hr_attendance', label: 'Attendance Management', href: '/admin/attendance', icon: 'fa-fingerprint', permission: 'attendance.manage', external: true },
      { key: 'hr_leave', label: 'Leave Management', href: '/leave-requests', icon: 'fa-calendar-days', permission: 'leave.manage', external: true },
      { key: 'hr_payroll', label: 'Payroll', href: '/admin/payroll', icon: 'fa-money-bill', permission: 'payroll.view', external: true },
      { key: 'hr_reports', label: 'HR Reports', href: '/admin/attendance/summaries', icon: 'fa-chart-line', permission: 'reports.hr', external: true },
    ],
  },
  {
    id: 'admin',
    title: 'Organization',
    toggleIcon: 'fa-building',
    toggleLabel: 'Organization',
    submenuId: 'empNavAdmin',
    sectionPermission: 'employees.manage',
    items: [
      { key: 'admin_employees', label: 'Employee Management', href: '/employees', icon: 'fa-users', permission: 'employees.manage', external: true },
      { key: 'admin_users', label: 'User Management', href: '/admin/team', icon: 'fa-user-gear', permission: 'users.manage', external: true },
      { key: 'admin_departments', label: 'Departments', href: '/departments', icon: 'fa-sitemap', permission: 'departments.manage', external: true },
      { key: 'admin_designations', label: 'Designations', href: '/designations', icon: 'fa-briefcase', permission: 'designations.manage', external: true },
      { key: 'admin_reports', label: 'Reports', href: '/dashboard', icon: 'fa-chart-bar', permission: 'reports.admin', external: true },
      { key: 'admin_settings', label: 'Organization Settings', href: '/business', icon: 'fa-gear', permission: 'organization.settings', external: true },
    ],
  },
  {
    id: 'owner',
    title: 'Owner Console',
    toggleIcon: 'fa-crown',
    toggleLabel: 'Owner Console',
    submenuId: 'empNavOwner',
    sectionPermission: '*',
    items: [
      { key: 'owner_billing', label: 'Billing & Subscription', href: '/billing', icon: 'fa-credit-card', permission: 'organization.settings', external: true },
      { key: 'owner_roles', label: 'Role Management', href: '/admin/team', icon: 'fa-users-cog', permission: 'users.manage', external: true },
      { key: 'owner_company', label: 'Company Settings', href: '/business', icon: 'fa-building', permission: 'organization.settings', external: true },
    ],
  },
  {
    id: 'account',
    items: [
      { key: 'documents', label: 'Documents', href: '/employee/documents', icon: 'fa-vault', permission: 'self.documents' },
      { key: 'profile', label: 'Profile', href: '/employee/profile', icon: 'fa-id-card', permission: 'self.profile' },
      { key: 'notifications', label: 'Notifications', href: '/employee/dashboard#notifications', icon: 'fa-bell', permission: 'self.notifications' },
    ],
  },
];

export function roleHasPermission(role, permission) {
  const grants = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[PORTAL_ROLES.EMPLOYEE];
  if (grants.includes('*')) return true;
  if (grants.includes(permission)) return true;

  const [namespace] = String(permission).split('.');
  if (grants.includes(`${namespace}.*`)) return true;
  if (grants.includes('self.*') && namespace === 'self') return true;
  if (grants.includes('team.*') && namespace === 'team') return true;

  return grants.some((grant) => {
    if (!grant.endsWith('.*')) return false;
    const prefix = grant.slice(0, -1);
    return permission === prefix || permission.startsWith(`${prefix}.`);
  });
}

export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[PORTAL_ROLES.EMPLOYEE];
}

export function buildPortalAccessFlags(role) {
  const check = (perm) => roleHasPermission(role, perm);
  return {
    role,
    canViewTeam: check('team.dashboard'),
    canApproveLeave: check('leave.approve'),
    canApproveAttendance: check('attendance.approve'),
    canManageEmployees: check('employees.records') || check('employees.manage'),
    canManagePayroll: check('payroll.view'),
    canManageOrganization: check('organization.settings'),
    isOwner: role === PORTAL_ROLES.OWNER,
    isManager: role === PORTAL_ROLES.MANAGER,
  };
}

export function buildPortalNavigation(role) {
  const seenKeys = new Set();

  return PORTAL_NAV_SECTIONS.map((section) => {
    if (section.sectionPermission && section.sectionPermission !== '*') {
      if (!roleHasPermission(role, section.sectionPermission)) return null;
    }
    if (section.sectionPermission === '*' && role !== PORTAL_ROLES.OWNER) return null;

    const items = (section.items || []).filter((item) => {
      if (!roleHasPermission(role, item.permission)) return false;
      if (item.hideWhenAlso?.some((k) => seenKeys.has(k))) return false;
      seenKeys.add(item.key);
      return true;
    });

    if (!items.length && !section.title) return null;
    if (!items.length) return null;

    return { ...section, items };
  }).filter(Boolean);
}

function mapEmployeeRecordRole(employeeRole) {
  const normalized = String(employeeRole || 'EMPLOYEE').toUpperCase();
  if (normalized === 'MANAGER') return PORTAL_ROLES.MANAGER;
  if (normalized === 'HR') return PORTAL_ROLES.HR_MANAGER;
  return PORTAL_ROLES.EMPLOYEE;
}

const ROLE_RANK = {
  [PORTAL_ROLES.EMPLOYEE]: 1,
  [PORTAL_ROLES.MANAGER]: 2,
  [PORTAL_ROLES.HR_MANAGER]: 3,
  [PORTAL_ROLES.ADMIN]: 4,
  [PORTAL_ROLES.OWNER]: 5,
};

function pickHigherRole(current, candidate) {
  if (!candidate) return current;
  if (!current) return candidate;
  return (ROLE_RANK[candidate] || 0) >= (ROLE_RANK[current] || 0) ? candidate : current;
}

function mapOrgMemberRole(memberRole, userGlobalRole, isOwner) {
  if (isOwner || userGlobalRole === 'shop_owner') return PORTAL_ROLES.OWNER;
  if (memberRole === 'admin' || userGlobalRole === 'admin') return PORTAL_ROLES.ADMIN;
  if (['HR_MANAGER', 'HR_EXECUTIVE', 'FINANCE'].includes(memberRole) || ['HR_MANAGER', 'HR_EXECUTIVE'].includes(userGlobalRole)) {
    return PORTAL_ROLES.HR_MANAGER;
  }
  if (memberRole === 'MANAGER' || userGlobalRole === 'MANAGER') return PORTAL_ROLES.MANAGER;
  return null;
}

/**
 * Resolve the effective portal role for an authenticated employee.
 * Combines Employee.role with linked User organization membership (same email).
 */
export async function resolveEmployeePortalRole(employee) {
  if (!employee) return PORTAL_ROLES.EMPLOYEE;

  let role = mapEmployeeRecordRole(employee.role);

  const email = String(employee.empEmail || '').trim().toLowerCase();
  if (!email || !employee.businessId) return role;

  const user = await User.findOne({
    where: { email },
    attributes: ['id', 'role', 'email'],
  });
  if (!user) return role;

  const business = await Business.findByPk(employee.businessId, { attributes: ['id', 'ownerId'] });
  const isOwner = Number(business?.ownerId) === Number(user.id);
  role = pickHigherRole(role, mapOrgMemberRole(null, user.role, isOwner));

  const membership = await OrganizationMember.findOne({
    where: { userId: user.id, businessId: employee.businessId, status: 'active' },
    attributes: ['role'],
  });
  if (membership) {
    role = pickHigherRole(role, mapOrgMemberRole(membership.role, user.role, isOwner));
  }

  return role || PORTAL_ROLES.EMPLOYEE;
}

export async function getDirectReportIds(managerEmployeeId, businessId) {
  const { default: Employee } = await import('../models/Employee.js');
  const rows = await Employee.findAll({
    where: {
      businessId,
      reportingManagerId: Number(managerEmployeeId),
      isActive: true,
    },
    attributes: ['id'],
  });
  return rows.map((r) => r.id);
}
