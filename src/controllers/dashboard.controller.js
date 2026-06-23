import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { getWidgetData, getInsightsData } from '../services/dashboard.service.js';
import { resolveWorkspaceIdFromRequest } from '../services/workspace.service.js';

async function resolveBusinessId(req) {
  if (req.workspaceId) return req.workspaceId;
  const workspaceId = await resolveWorkspaceIdFromRequest(req);
  if (workspaceId) return workspaceId;
  return null;
}

export const getWidgets = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  if (!businessId) {
    throw new ApiError(400, 'Select a workspace to load dashboard widgets');
  }

  const data = await getWidgetData(businessId);
  return res.json(new ApiResponse(200, data, 'Dashboard widgets'));
});

export const getInsights = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  if (!businessId) {
    throw new ApiError(400, 'Select a workspace to load dashboard insights');
  }

  const data = await getInsightsData(businessId, req.user?.id);
  return res.json(new ApiResponse(200, data, 'Dashboard insights'));
});
