import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { resolveTenantBusinessId } from '../utils/tenantContext.util.js';
import { Business, OrganizationMember } from '../models/index.js';
import { isPlatformAdmin } from '../services/organization.service.js';

const SETUP_EDIT_ROLES = new Set(['admin', 'SUPER_ADMIN', 'shop_owner']);
const SETUP_VIEW_ROLES = new Set(['admin', 'SUPER_ADMIN', 'shop_owner', 'HR_MANAGER', 'HR_EXECUTIVE']);

export async function getUserOrgRole(user, businessId) {
  if (!user?.id || !businessId) return null;
  if (isPlatformAdmin(user)) return 'admin';

  const business = await Business.findByPk(businessId, { attributes: ['id', 'ownerId'] });
  if (business?.ownerId === user.id) return 'shop_owner';

  const membership = await OrganizationMember.findOne({
    where: { userId: user.id, businessId, status: 'active' },
    attributes: ['role'],
  });
  return membership?.role || user.role;
}

export async function assertSetupView(req) {
  const businessId = await resolveTenantBusinessId(req);
  const orgRole = await getUserOrgRole(req.user, businessId);
  const globalRole = req.user?.role;

  const canView = SETUP_VIEW_ROLES.has(orgRole) || SETUP_VIEW_ROLES.has(globalRole);
  if (!canView) {
    throw new ApiError(403, 'You do not have permission to view company setup');
  }
  return { businessId, canEdit: SETUP_EDIT_ROLES.has(orgRole) || SETUP_EDIT_ROLES.has(globalRole) || orgRole === 'admin' };
}

export async function assertSetupEdit(req) {
  const businessId = await resolveTenantBusinessId(req);
  const orgRole = await getUserOrgRole(req.user, businessId);
  const globalRole = req.user?.role;

  const canEdit = SETUP_EDIT_ROLES.has(orgRole) || SETUP_EDIT_ROLES.has(globalRole) || orgRole === 'admin';
  if (!canEdit) {
    throw new ApiError(403, 'Only organization owners and admins can modify company setup');
  }
  return businessId;
}

export const requireSetupView = asyncHandler(async (req, res, next) => {
  const ctx = await assertSetupView(req);
  req.setupContext = ctx;
  req.organizationId = ctx.businessId;
  req.businessId = ctx.businessId;
  next();
});

export const requireSetupEdit = asyncHandler(async (req, res, next) => {
  const businessId = await assertSetupEdit(req);
  req.organizationId = businessId;
  req.businessId = businessId;
  req.setupCanEdit = true;
  next();
});
