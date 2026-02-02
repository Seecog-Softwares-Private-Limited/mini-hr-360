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

export const getSalaryStructure = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const id = Number(req.params.id);
  if (!id) throw new ApiError(400, 'Invalid structure id');
  const data = await salaryService.getStructureById(businessId, id);
  res.json(new ApiResponse(200, data));
});

export const createSalaryStructure = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  try {
    console.log('Creating SalaryStructure payload:', JSON.stringify(req.body));
    const created = await salaryService.createStructure(businessId, req.body);
    res.json(new ApiResponse(201, created));
  } catch (err) {
    console.error('Error creating SalaryStructure:', err && err.message ? err.message : err);
    // include SQL if available
    if (err?.original) console.error('SQL error detail:', err.original);
    res.status(500).json({ success: false, message: 'Failed to create salary structure', error: err?.message || String(err) });
  }
});

export const updateSalaryStructure = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const id = Number(req.params.id);
  if (!id) throw new ApiError(400, 'Invalid structure id');
  const updated = await salaryService.updateStructure(businessId, id, req.body);
  res.json(new ApiResponse(200, updated, 'Salary structure updated'));
});

export const deleteSalaryStructure = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const id = Number(req.params.id);
  if (!id) throw new ApiError(400, 'Invalid structure id');
  try {
    const result = await salaryService.deleteStructure(businessId, id);
    res.json(new ApiResponse(200, result, 'Salary structure deleted'));
  } catch (err) {
    throw new ApiError(400, err.message || 'Delete failed');
  }
});

export const getStructureAssignments = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const id = Number(req.params.id);
  if (!id) throw new ApiError(400, 'Invalid structure id');
  const data = await salaryService.listAssignments(businessId, id);
  res.json(new ApiResponse(200, data));
});

export const unassignStructureEmployees = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const id = Number(req.params.id);
  const { employeeIds } = req.body || {};
  if (!id) throw new ApiError(400, 'Invalid structure id');
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) throw new ApiError(400, 'No employees to unassign');
  const result = await salaryService.unassignEmployees(businessId, id, employeeIds);
  res.json(new ApiResponse(200, result, 'Employees unassigned'));
});

export const assignSalaryStructure = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const payload = req.body || {};
  const result = await salaryService.assignToEmployee(businessId, payload);
  res.json(new ApiResponse(200, result, 'Salary structure assigned'));
});
