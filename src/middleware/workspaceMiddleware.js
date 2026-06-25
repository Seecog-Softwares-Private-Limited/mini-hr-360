import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getWorkspaceById,
  listAccessibleWorkspaces,
} from '../services/workspace.service.js';
import { resolveOrganizationIdFromRequest } from '../services/organization.service.js';

/**
 * Attaches multi-tenant organization context to the request.
 * Use after verifyUser.
 */
export const attachWorkspaceContext = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  req.accessibleWorkspaces = await listAccessibleWorkspaces(req.user);
  req.organizationId = await resolveOrganizationIdFromRequest(req);
  req.workspaceId = req.organizationId;
  req.businessId = req.organizationId;
  req.workspace = req.organizationId
    ? req.accessibleWorkspaces.find((w) => w.id === req.organizationId) ||
      (await getWorkspaceById(req.organizationId))
    : null;

  next();
});
