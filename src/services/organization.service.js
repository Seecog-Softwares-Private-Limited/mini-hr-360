import crypto from 'crypto';
import { Op } from 'sequelize';
import { Business, OrganizationMember, Subscription, User } from '../models/index.js';
import { setOrganizationCookie } from '../utils/workspaceCookie.util.js';

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'];

export function isPlatformAdmin(user) {
  const role = String(user?.role || '');
  return role === 'SUPER_ADMIN' || role === 'admin';
}

export const ORG_ASSIGNABLE_ROLES = [
  'admin',
  'HR_MANAGER',
  'MANAGER',
  'EMPLOYEE',
];

export function formatUserSummary(user) {
  const plain = user?.toJSON ? user.toJSON() : user;
  const effectiveRole = plain.organizationRole || plain.role;
  return {
    id: plain.id,
    name: `${plain.firstName || ''} ${plain.lastName || ''}`.trim() || plain.email,
    email: plain.email,
    role: effectiveRole,
    globalRole: plain.role,
    organizationRole: plain.organizationRole || plain.role,
    isOrganizationOwner: !!plain.isOrganizationOwner,
    status: plain.status,
  };
}

export async function getOrganizationMemberUserIds(businessId) {
  if (!businessId) return [];

  const business = await Business.findByPk(businessId, { attributes: ['id', 'ownerId'] });
  if (!business) return [];

  const ids = new Set();
  if (business.ownerId) ids.add(business.ownerId);

  const members = await OrganizationMember.findAll({
    where: { businessId, status: 'active' },
    attributes: ['userId'],
  });
  for (const member of members) ids.add(member.userId);

  return [...ids];
}

export async function userBelongsToOrganization(userId, businessId) {
  const memberIds = await getOrganizationMemberUserIds(businessId);
  return memberIds.includes(Number(userId));
}

export async function userCanManageOrganizationRoles(user, businessId) {
  if (!user?.id || !businessId) return false;
  if (isPlatformAdmin(user)) return true;

  const business = await Business.findByPk(businessId, { attributes: ['id', 'ownerId'] });
  return business?.ownerId === user.id;
}

export async function listOrganizationUsers(businessId) {
  if (!businessId) return [];

  const business = await Business.findByPk(businessId, { attributes: ['id', 'ownerId'] });
  if (!business) return [];

  const memberships = await OrganizationMember.findAll({
    where: { businessId, status: 'active' },
    attributes: ['userId', 'role'],
  });

  const roleByUserId = new Map(memberships.map((m) => [Number(m.userId), m.role || 'EMPLOYEE']));
  const userIds = new Set([Number(business.ownerId), ...memberships.map((m) => Number(m.userId))]);
  const ids = [...userIds].filter((id) => Number.isFinite(id) && id > 0);
  if (!ids.length) return [];

  const users = await User.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'status'],
    order: [['firstName', 'ASC']],
  });

  const withOrgRole = users.map((user) => {
    const plain = user.toJSON();
    const isOrganizationOwner = Number(plain.id) === Number(business.ownerId);
    return {
      ...plain,
      organizationRole: isOrganizationOwner ? 'shop_owner' : (roleByUserId.get(Number(plain.id)) || 'EMPLOYEE'),
      isOrganizationOwner,
    };
  });

  return withOrgRole.map(formatUserSummary);
}

export async function listUsersForRequest(req) {
  if (isPlatformAdmin(req.user)) {
    const users = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'status'],
      order: [['firstName', 'ASC']],
    });
    return users.map(formatUserSummary);
  }

  const organizationId = await resolveOrganizationIdFromRequest(req);
  if (!organizationId) {
    const self = await User.findByPk(req.user.id, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'status'],
    });
    return self ? [formatUserSummary(self)] : [];
  }

  return listOrganizationUsers(organizationId);
}

export function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export async function userHasActivePlan(user) {
  if (!user?.id) return false;

  try {
    const owned = await Business.findAll({
      where: { ownerId: user.id },
      attributes: ['id'],
    });
    if (!owned.length) return false;

    const businessIds = owned.map((b) => b.id);
    const subscription = await Subscription.findOne({
      where: {
        businessId: { [Op.in]: businessIds },
        status: { [Op.in]: ACTIVE_SUBSCRIPTION_STATUSES },
      },
    });

    return !!subscription;
  } catch (err) {
    // Fallback so organization listing/capabilities never fail due to billing schema drift.
    console.warn('userHasActivePlan fallback=false:', err?.message || err);
    return false;
  }
}

export async function getUserOwnedBusinesses(user) {
  if (!user?.id) return [];
  return Business.findAll({
    where: { ownerId: user.id },
    order: [['createdAt', 'ASC']],
  });
}

export async function getUserMemberships(user) {
  if (!user?.id) return [];
  try {
    return await OrganizationMember.findAll({
      where: { userId: user.id, status: 'active' },
      include: [{ model: Business, as: 'business' }],
    });
  } catch (err) {
    console.error('getUserMemberships failed:', err?.message || err);
    return [];
  }
}

/**
 * Resolve the active organization id for an authenticated request.
 */
export async function resolveOrganizationIdFromRequest(req) {
  const user = req.user;
  if (!user?.id) return null;

  const organizations = await getUserOrganizations(user);
  if (!organizations.length) return null;

  const allowed = new Set(organizations.map((o) => o.id));

  const candidates = [
    req.cookies?.mh360_organization_id,
    req.cookies?.mh360_workspace_id,
    req.get('x-business-id'),
    req.query?.businessId,
    req.body?.businessId,
    req.params?.businessId,
    req.user?.businessId,
    req.user?.defaultBusinessId,
  ];

  for (const raw of candidates) {
    const id = Number(raw);
    if (Number.isFinite(id) && id > 0 && allowed.has(id)) {
      return id;
    }
  }

  const owned = organizations.find((o) => o.membershipType === 'owner');
  return owned?.id ?? organizations[0]?.id ?? null;
}

/** Default organization for a user (owner org first, else first membership). */
export async function resolveDefaultOrganizationIdForUser(user) {
  if (!user?.id) return null;
  const organizations = await getUserOrganizations(user);
  if (!organizations.length) return null;
  const owned = organizations.find((o) => o.membershipType === 'owner');
  return owned?.id ?? organizations[0]?.id ?? null;
}

/**
 * Attach active organization to the request and persist cookie when missing.
 * Call after authentication on each request so SSR pages and forms get the right tenant.
 */
export async function ensureOrganizationContext(req, res) {
  if (!req.user?.id) return null;

  const organizationId = await resolveOrganizationIdFromRequest(req);
  if (!organizationId) return null;

  const cookieRaw = req.cookies?.mh360_organization_id || req.cookies?.mh360_workspace_id;
  if (String(cookieRaw || '') !== String(organizationId)) {
    setOrganizationCookie(res, organizationId);
  }

  req.organizationId = organizationId;
  req.workspaceId = organizationId;
  req.businessId = organizationId;
  return organizationId;
}

export async function getUserOrganizations(user) {
  const owned = await getUserOwnedBusinesses(user);
  const memberships = await getUserMemberships(user);
  const memberBusinessIds = new Set(memberships.map((m) => m.businessId));

  const ownedItems = owned.map((business) => ({
    ...business.toJSON(),
    membershipType: 'owner',
  }));

  const memberItems = memberships
    .filter((m) => m.business && !ownedItems.some((o) => o.id === m.businessId))
    .map((m) => ({
      ...m.business.toJSON(),
      membershipType: 'member',
      memberRole: m.role,
    }));

  return [...ownedItems, ...memberItems];
}

export async function userHasOrganization(user) {
  if (!user?.id) return false;
  const ownedCount = await Business.count({ where: { ownerId: user.id } });
  if (ownedCount > 0) return true;
  const memberCount = await OrganizationMember.count({
    where: { userId: user.id, status: 'active' },
  });
  return memberCount > 0;
}

export async function getOrganizationCapabilities(user, { organizations: preloaded } = {}) {
  const organizations = preloaded ?? (await getUserOrganizations(user));
  const hasOrganization = organizations.length > 0;
  const ownedCount = organizations.filter((o) => o.membershipType === 'owner').length;
  const hasPlan = hasOrganization ? await userHasActivePlan(user) : false;

  // Product rule: any authenticated user can either create one basic organization
  // or join one organization, but cannot be linked to more than one organization.
  const canCreate = !hasOrganization && ownedCount === 0;
  const canJoin = !hasOrganization;

  return {
    hasOrganization,
    hasPlan,
    canCreate,
    canJoin,
    ownedCount,
  };
}

export async function assertCanCreateOrganization(user) {
  const caps = await getOrganizationCapabilities(user);
  if (caps.hasOrganization) {
    const err = new Error('You are already linked to an organization. Only one organization is allowed per account.');
    err.code = 'ORG_LIMIT';
    throw err;
  }
  if (!caps.canCreate) {
    const err = new Error('You cannot create another organization. Each account can create only one basic organization.');
    err.code = 'FORBIDDEN';
    throw err;
  }
}

export async function assertCanJoinOrganization(user) {
  const caps = await getOrganizationCapabilities(user);
  if (caps.hasOrganization) {
    const err = new Error('You are already linked to an organization. Each account can join only one organization.');
    err.code = 'ORG_LIMIT';
    throw err;
  }
  if (!caps.canJoin) {
    const err = new Error('You cannot join an organization with this account.');
    err.code = 'FORBIDDEN';
    throw err;
  }
}
