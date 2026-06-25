import crypto from 'crypto';
import { Op } from 'sequelize';
import { Business, OrganizationMember, Subscription } from '../models/index.js';

const ADMIN_ROLES = new Set(['admin', 'SUPER_ADMIN']);
const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'];

export function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export async function userHasActivePlan(user) {
  if (!user?.id) return false;

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

export async function getOrganizationCapabilities(user) {
  const role = String(user?.role || '').toLowerCase();
  const isAdmin = ADMIN_ROLES.has(user?.role) || role === 'super_admin';
  const hasOrganization = await userHasOrganization(user);
  const hasPlan = await userHasActivePlan(user);
  const ownedCount = await Business.count({ where: { ownerId: user.id } });

  let canCreate = false;
  let canJoin = false;

  if (!hasOrganization) {
    if (isAdmin) {
      canCreate = ownedCount === 0;
    } else if (role === 'shop_owner' && hasPlan && ownedCount === 0) {
      canCreate = true;
    } else if (!isAdmin) {
      canJoin = true;
    }
  }

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
    const err = new Error(
      caps.hasPlan
        ? 'You cannot create another organization.'
        : 'Purchase a plan to create an organization, or join one using an invite code.'
    );
    err.code = 'FORBIDDEN';
    throw err;
  }
}

export async function assertCanJoinOrganization(user) {
  const caps = await getOrganizationCapabilities(user);
  if (caps.hasOrganization) {
    const err = new Error('You are already linked to an organization.');
    err.code = 'ORG_LIMIT';
    throw err;
  }
  if (!caps.canJoin) {
    const err = new Error('You cannot join an organization with this account.');
    err.code = 'FORBIDDEN';
    throw err;
  }
}
