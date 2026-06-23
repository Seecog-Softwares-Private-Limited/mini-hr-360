import { ApiError } from './ApiError.js';
import {
  resolveWorkspaceIdFromRequest,
  userCanAccessWorkspace,
} from '../services/workspace.service.js';

/**
 * Resolve and validate tenant business id for API handlers.
 */
export async function resolveTenantBusinessId(req) {
  if (req.workspaceId) {
    const allowed = await userCanAccessWorkspace(req.user, req.workspaceId);
    if (!allowed) {
      throw new ApiError(403, 'You do not have access to this workspace');
    }
    return req.workspaceId;
  }

  const workspaceId = await resolveWorkspaceIdFromRequest(req);
  if (!workspaceId) {
    throw new ApiError(400, 'Workspace required. Select a workspace from the sidebar.');
  }

  const allowed = await userCanAccessWorkspace(req.user, workspaceId);
  if (!allowed) {
    throw new ApiError(403, 'You do not have access to this workspace');
  }

  return workspaceId;
}
