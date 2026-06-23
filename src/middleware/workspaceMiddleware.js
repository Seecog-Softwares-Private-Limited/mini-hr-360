import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getWorkspaceById,
  listAccessibleWorkspaces,
  resolveWorkspaceIdFromRequest,
} from '../services/workspace.service.js';

/**
 * Attaches multi-tenant workspace context to the request.
 * Use after verifyUser.
 */
export const attachWorkspaceContext = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  req.accessibleWorkspaces = await listAccessibleWorkspaces(req.user);
  req.workspaceId = await resolveWorkspaceIdFromRequest(req);
  req.workspace = req.workspaceId
    ? req.accessibleWorkspaces.find((w) => w.id === req.workspaceId) ||
      (await getWorkspaceById(req.workspaceId))
    : null;

  // Legacy alias used across payroll controllers
  req.businessId = req.workspaceId;

  next();
});
