import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { ApiError } from '../../../utils/ApiError.js';
import * as payrollRunService from '../../../services/payroll/payrollRun.service.js';

export const getPayrollRegister = asyncHandler(async (req, res) => {
  const runId = Number(req.params.runId);

  if (!runId || Number.isNaN(runId)) {
    throw new ApiError(400, 'runId is required in URL (example: /register/1)');
  }

  const data = await payrollRunService.getRegister(runId);
  return res.json(new ApiResponse(200, data));
});
