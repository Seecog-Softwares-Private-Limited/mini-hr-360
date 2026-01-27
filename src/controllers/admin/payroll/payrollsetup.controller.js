import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { ApiError } from '../../../utils/ApiError.js';
import * as payrollSetupService from '../../../services/payroll/payrollSetup.service.js';
import { Business } from '../../../models/index.js'; // ✅ used for ownerId fallback

// ✅ one single resolver used by both GET + POST
const resolveBusinessId = async (req) => {
  const raw =
    req.get('x-business-id') ||            // header
    req.params?.businessId ||              // /setup/:businessId (GET)
    req.query?.businessId ||               // ?businessId=26
    req.body?.businessId ||                // POST body
    req.user?.businessId ||                // if token stores businessId
    req.user?.business_id;

  const businessId = raw ? Number(raw) : null;

  // ✅ If found directly
  if (Number.isFinite(businessId) && businessId > 0) return businessId;

  // ✅ Fallback: find business by logged-in ownerId (if user is logged in)
  const ownerId = req.user?.id;
  if (ownerId) {
    const biz = await Business.findOne({
      where: { ownerId },
      order: [['createdAt', 'ASC']],
    });
    if (biz?.id) return biz.id;
  }

  throw new ApiError(401, 'Unauthorized: businessId not found. Send x-business-id or login.');
};

export const getPayrollSetup = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const setup = await payrollSetupService.getSetup(businessId);
  return res.json(new ApiResponse(200, setup));
});

export const savePayrollSetup = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const saved = await payrollSetupService.saveSetup(businessId, req.body);
  return res.json(new ApiResponse(200, saved, 'Payroll setup saved'));
});
