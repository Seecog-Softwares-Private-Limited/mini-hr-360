import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import {
  createWorkspace as createWorkspaceRecord,
  getWorkspaceById,
  listAccessibleWorkspaces,
  resolveWorkspaceIdFromRequest,
  userCanAccessWorkspace,
  userCanCreateWorkspace,
} from '../services/workspace.service.js';
import { setWorkspaceCookie, clearWorkspaceCookie } from '../utils/workspaceCookie.util.js';

export const listWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await listAccessibleWorkspaces(req.user);
  const currentId = await resolveWorkspaceIdFromRequest(req);
  const current = currentId ? await getWorkspaceById(currentId) : null;

  return res.status(200).json(
    new ApiResponse(200, { workspaces, current, currentId }, 'Workspaces loaded')
  );
});

export const getCurrentWorkspace = asyncHandler(async (req, res) => {
  const currentId = await resolveWorkspaceIdFromRequest(req);
  const current = currentId ? await getWorkspaceById(currentId) : null;

  return res.status(200).json(
    new ApiResponse(200, { current, currentId }, 'Current workspace')
  );
});

export const switchWorkspace = asyncHandler(async (req, res) => {
  const workspaceId = Number(req.body?.workspaceId ?? req.body?.businessId);

  if (!Number.isFinite(workspaceId) || workspaceId <= 0) {
    return res.status(400).json(new ApiResponse(400, null, 'workspaceId is required'));
  }

  const allowed = await userCanAccessWorkspace(req.user, workspaceId);
  if (!allowed) {
    return res.status(403).json(new ApiResponse(403, null, 'You do not have access to this workspace'));
  }

  const workspace = await getWorkspaceById(workspaceId);
  setWorkspaceCookie(res, workspaceId);

  return res.status(200).json(
    new ApiResponse(200, { workspace, workspaceId }, 'Workspace switched')
  );
});

export const clearWorkspace = asyncHandler(async (req, res) => {
  clearWorkspaceCookie(res);
  return res.status(200).json(new ApiResponse(200, null, 'Workspace cleared'));
});

export const createWorkspace = asyncHandler(async (req, res) => {
  try {
    const workspace = await createWorkspaceRecord(req.user, req.body);
    setWorkspaceCookie(res, workspace.id);

    return res.status(201).json(
      new ApiResponse(201, { workspace, workspaceId: workspace.id }, 'Workspace created')
    );
  } catch (error) {
    if (error.code === 'FORBIDDEN') {
      return res.status(403).json(new ApiResponse(403, null, error.message));
    }
    if (error.code === 'VALIDATION') {
      return res.status(400).json(new ApiResponse(400, null, error.message));
    }
    throw error;
  }
});

export const getWorkspacePermissions = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new ApiResponse(200, { canCreate: userCanCreateWorkspace(req.user) }, 'Workspace permissions')
  );
});
