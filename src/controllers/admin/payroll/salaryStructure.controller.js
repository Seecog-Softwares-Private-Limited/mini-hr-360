import {asyncHandler} from '../../../utils/asyncHandler.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import * as salaryService from '../../../services/payroll/salaryStructure.service.js';
import { ApiError } from '../../../utils/ApiError.js';

const resolveBusinessId = (req) => {
  const raw =
    req.get('x-business-id') ||       // ✅ header
    req.query?.businessId ||          // ✅ ?businessId=26
    req.body?.businessId ||           // ✅ body (POST)
    req.params?.businessId ||         // ✅ if you ever add /:businessId
    req.user?.businessId ||           // ✅ token user
    req.user?.business_id;

  const businessId = raw ? Number(raw) : null;

  if (!businessId || Number.isNaN(businessId)) {
    throw new ApiError(401, 'Unauthorized: businessId not found. Send x-business-id or login.');
  }

  return businessId;
};

export const listSalaryStructures = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const data = await salaryService.listStructures(businessId);
  res.json(new ApiResponse(200, data));
});

export const createSalaryStructure = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const created = await salaryService.createStructure(businessId, req.body);
  res.json(new ApiResponse(201, created));
});

export const assignSalaryStructure = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const result = await salaryService.assignToEmployee(businessId, req.body);
  res.json(new ApiResponse(200, result, 'Salary structure assigned'));
});
