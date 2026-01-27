import * as payslipService from '../../../services/payroll/payslip.service.js';
import {asyncHandler} from '../../../utils/asyncHandler.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';

export const generatePayslips = asyncHandler(async (req, res) => {
  const result = await payslipService.generate(req.params.runId);
  res.json(new ApiResponse(200, result, 'Payslips generated'));
});

export const publishPayslips = asyncHandler(async (req, res) => {
  const result = await payslipService.publish(req.params.runId);
  res.json(new ApiResponse(200, result, 'Payslips published'));
});
