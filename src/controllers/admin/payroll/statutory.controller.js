import {asyncHandler} from '../../../utils/asyncHandler.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import * as statutoryService from '../../../services/payroll/statutoryReports.service.js';

export const getPFReport = asyncHandler(async (req, res) => {
  const data = await statutoryService.generatePFReport(req.params.runId);
  res.json(new ApiResponse(200, data, 'PF report generated'));
});

export const getESIReport = asyncHandler(async (req, res) => {
  const data = await statutoryService.generateESIReport(req.params.runId);
  res.json(new ApiResponse(200, data, 'ESI report generated'));
});

export const getPTReport = asyncHandler(async (req, res) => {
  const data = await statutoryService.generatePTReport(req.params.runId);
  res.json(new ApiResponse(200, data, 'PT report generated'));
});

export const getTDSReport = asyncHandler(async (req, res) => {
  const data = await statutoryService.generateTDSReport(req.params.runId);
  res.json(new ApiResponse(200, data, 'TDS report generated'));
});
