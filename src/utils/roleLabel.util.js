const USER_ROLE_LABELS = {
  admin: 'Administrator',
  SUPER_ADMIN: 'Super Admin',
  shop_owner: 'Administrator',
  shop_manager: 'Manager',
  shop_worker: 'Employee',
  HR_MANAGER: 'HR Manager',
  HR_EXECUTIVE: 'HR Executive',
  FINANCE: 'Finance',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
};

const EMPLOYEE_ROLE_LABELS = {
  EMPLOYEE: 'Employee',
  MANAGER: 'Manager',
  HR: 'HR Manager',
};

export function formatUserRoleLabel(role) {
  const key = String(role || '').trim();
  if (!key) return 'Employee';
  if (USER_ROLE_LABELS[key]) return USER_ROLE_LABELS[key];
  return key
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatEmployeeRecordRoleLabel(role) {
  const key = String(role || 'EMPLOYEE').trim().toUpperCase();
  return EMPLOYEE_ROLE_LABELS[key] || formatUserRoleLabel(key);
}

/**
 * Display role for HR shell — prefers org membership, then linked employee record, then user role.
 */
export async function resolveUserDisplayRole(user, organizationId) {
  if (!user?.id) return 'Employee';

  const { Business, OrganizationMember, Employee } = await import('../models/index.js');
  const email = String(user.email || '').trim().toLowerCase();

  if (organizationId) {
    const business = await Business.findByPk(organizationId, { attributes: ['id', 'ownerId'] });
    const isOwner = Number(business?.ownerId) === Number(user.id);

    if (!isOwner) {
      const membership = await OrganizationMember.findOne({
        where: { userId: user.id, businessId: organizationId, status: 'active' },
        attributes: ['role'],
      });
      if (membership?.role) {
        return formatUserRoleLabel(membership.role);
      }
    }
  }

  if (email) {
    const employeeWhere = { empEmail: email };
    if (organizationId) employeeWhere.businessId = organizationId;

    const employee = await Employee.findOne({
      where: employeeWhere,
      attributes: ['role'],
    });
    if (employee?.role) {
      return formatEmployeeRecordRoleLabel(employee.role);
    }
  }

  return formatUserRoleLabel(user.role);
}

/**
 * Display role for employee portal sidebar — uses the employee record role only.
 */
export function resolveEmployeeDisplayRole(employee) {
  return formatEmployeeRecordRoleLabel(employee?.role);
}
