import { Business } from '../models/index.js';
import { getUserOrganizations, resolveOrganizationIdFromRequest } from './organization.service.js';

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

  const role = String(user.role || '');

  if (ADMIN_ROLES.has(role)) {
    const rows = await Business.findAll({ order: [['businessName', 'ASC']] });
    return rows.map(formatWorkspace);
  }

  const organizations = await getUserOrganizations(user);
  return organizations.map(formatWorkspace);
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
  return resolveOrganizationIdFromRequest(req);
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
