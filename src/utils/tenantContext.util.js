import { ApiError } from './ApiError.js';
import {
  resolveWorkspaceIdFromRequest,
  userCanAccessWorkspace,
} from '../services/workspace.service.js';

/**
 * Resolve and validate tenant business id for API handlers.
 */
export async function resolveTenantBusinessId(req) {
  if (req.organizationId || req.businessId || req.workspaceId) {
    const id = req.organizationId || req.businessId || req.workspaceId;
    const allowed = await userCanAccessWorkspace(req.user, id);
    if (!allowed) {
      throw new ApiError(403, 'You do not have access to this organization');
    }
    return id;
  }

  const workspaceId = await resolveWorkspaceIdFromRequest(req);
  if (!workspaceId) {
    throw new ApiError(400, 'No organization linked. Create or join an organization first.');
  }

  const allowed = await userCanAccessWorkspace(req.user, workspaceId);
  if (!allowed) {
    throw new ApiError(403, 'You do not have access to this organization');
  }

  return workspaceId;
}
