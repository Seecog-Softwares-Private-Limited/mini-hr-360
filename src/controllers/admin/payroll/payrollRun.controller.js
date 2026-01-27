import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { ApiError } from '../../../utils/ApiError.js';
import * as payrollRunService from '../../../services/payroll/payrollRun.service.js';

const resolveBusinessId = (req) => {
  const raw =
    req.get('x-business-id') ||
    req.query?.businessId ||
    req.body?.businessId ||
    req.params?.businessId ||
    req.user?.businessId ||
    req.user?.business_id;

  const businessId = raw ? Number(raw) : null;

  if (!businessId || Number.isNaN(businessId)) {
    throw new ApiError(401, 'Unauthorized: businessId not found. Send x-business-id or login.');
  }

  return businessId;
};

const resolveUserId = (req, fieldName = 'userId') => {
  const raw =
    req.user?.id ||               // if logged in
    req.body?.[fieldName] ||      // allow from body for testing
    req.get('x-user-id');         // optional header fallback

  const userId = raw ? Number(raw) : null;

  if (!userId || Number.isNaN(userId)) {
    throw new ApiError(401, `Unauthorized: ${fieldName} not found. Login or send ${fieldName}/x-user-id.`);
  }

  return userId;
};

export const createPayrollRun = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const run = await payrollRunService.createRun(businessId, req.body);
  return res.json(new ApiResponse(201, run, 'Payroll run created'));
});

export const getPayrollRun = asyncHandler(async (req, res) => {
  const run = await payrollRunService.getRun(req.params.id);
  if (!run) throw new ApiError(404, 'Payroll run not found');
  return res.json(new ApiResponse(200, run));
});

export const approvePayrollRun = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const approvedByUserId = resolveUserId(req, 'approvedBy'); // ✅ reads req.user.id OR body.approvedBy

  const run = await payrollRunService.approveRun({
    businessId,
    runId: Number(req.params.id),
    approvedByUserId,
    approvedAt: req.body?.approvedAt || null,
  });

  return res.json(new ApiResponse(200, run, 'Payroll approved'));
});

export const lockPayrollRun = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const lockedByUserId = resolveUserId(req, 'lockedBy'); // ✅ reads req.user.id OR body.lockedBy

  const run = await payrollRunService.lockRun({
    businessId,
    runId: Number(req.params.id),
    lockedByUserId,
  });

  return res.json(new ApiResponse(200, run, 'Payroll locked'));
});
