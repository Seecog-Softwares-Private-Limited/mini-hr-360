import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getWidgetData, getInsightsData, emptyWidgets, emptyInsights } from '../services/dashboard.service.js';
import { getCommandCenterData, emptyCommandCenter } from '../services/dashboard/commandCenter.service.js';
import { resolveOrganizationIdFromRequest } from '../services/organization.service.js';

async function resolveBusinessId(req) {
  if (req.businessId || req.workspaceId) {
    return req.businessId || req.workspaceId;
  }
  return resolveOrganizationIdFromRequest(req);
}

export const getWidgets = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  if (!businessId) {
    return res.json(new ApiResponse(200, emptyWidgets(), 'No organization linked — empty dashboard widgets'));
  }

  const data = await getWidgetData(businessId);
  return res.json(new ApiResponse(200, data, 'Dashboard widgets'));
});

export const getInsights = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  if (!businessId) {
    return res.json(new ApiResponse(200, emptyInsights(), 'No organization linked — empty dashboard insights'));
  }

  const data = await getInsightsData(businessId, req.user?.id);
  return res.json(new ApiResponse(200, data, 'Dashboard insights'));
});

export const getCommandCenter = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  if (!businessId) {
    return res.json(new ApiResponse(200, emptyCommandCenter(), 'No organization linked — empty command center'));
  }

  const data = await getCommandCenterData(businessId);
  return res.json(new ApiResponse(200, data, 'Dashboard command center'));
});
