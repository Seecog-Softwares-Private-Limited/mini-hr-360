import { Business } from '../models/Business.js';

const ADMIN_ROLES = new Set(['admin', 'SUPER_ADMIN']);

export function workspaceInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'WS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function formatWorkspace(business) {
  if (!business) return null;
  const plain = business.toJSON ? business.toJSON() : business;
  return {
    id: plain.id,
    name: plain.businessName,
    initials: workspaceInitials(plain.businessName),
    category: plain.category || null,
    country: plain.country || null,
  };
}

/**
 * Businesses the user may switch into.
 */
export async function listAccessibleWorkspaces(user) {
  if (!user?.id) return [];

  const role = String(user.role || '').toLowerCase();

  if (ADMIN_ROLES.has(role)) {
    const rows = await Business.findAll({ order: [['businessName', 'ASC']] });
    return rows.map(formatWorkspace);
  }

  if (role === 'shop_owner') {
    const rows = await Business.findAll({
      where: { ownerId: user.id },
      order: [['businessName', 'ASC']],
    });
    return rows.map(formatWorkspace);
  }

  // HR / finance / manager roles: all workspaces (matches existing business listing behaviour)
  const rows = await Business.findAll({ order: [['businessName', 'ASC']] });
  return rows.map(formatWorkspace);
}

export async function userCanAccessWorkspace(user, workspaceId) {
  if (!user?.id || !workspaceId) return false;
  const workspaces = await listAccessibleWorkspaces(user);
  return workspaces.some((w) => w.id === Number(workspaceId));
}

/**
 * Resolve active workspace id from request (cookie → header → query → fallbacks).
 */
export async function resolveWorkspaceIdFromRequest(req) {
  const user = req.user;
  if (!user?.id) return null;

  const workspaces = await listAccessibleWorkspaces(user);
  if (!workspaces.length) return null;

  const allowed = new Set(workspaces.map((w) => w.id));

  const candidates = [
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

  const owned = await Business.findOne({
    where: { ownerId: user.id },
    order: [['createdAt', 'ASC']],
  });
  if (owned?.id && allowed.has(owned.id)) {
    return owned.id;
  }

  if (workspaces.length === 1) {
    return workspaces[0].id;
  }

  return workspaces[0]?.id ?? null;
}

export async function getWorkspaceById(workspaceId) {
  const business = await Business.findByPk(workspaceId);
  return formatWorkspace(business);
}

const CREATE_ROLES = new Set(['admin', 'super_admin', 'shop_owner']);

export function userCanCreateWorkspace(user) {
  const role = String(user?.role || '').toLowerCase();
  if (CREATE_ROLES.has(role)) return true;
  return role.includes('admin');
}

export async function createWorkspace(user, data = {}) {
  if (!userCanCreateWorkspace(user)) {
    const err = new Error('You do not have permission to create workspaces');
    err.code = 'FORBIDDEN';
    throw err;
  }

  const businessName = String(data.businessName || data.name || '').trim();
  const category = String(data.category || 'other').trim();
  const country = String(data.country || 'India').trim();

  if (!businessName) {
    const err = new Error('Workspace name is required');
    err.code = 'VALIDATION';
    throw err;
  }

  const business = await Business.create({
    businessName,
    category,
    country,
    timezone: data.timezone || 'Asia/Kolkata',
    description: data.description || null,
    phoneNo: data.phoneNo || null,
    whatsappNo: data.whatsappNo || null,
    ownerId: user.id,
  });

  return formatWorkspace(business);
}
