import * as payslipService from '../../../services/payroll/payslip.service.js';
import * as payrollRunService from '../../../services/payroll/payrollRun.service.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { ApiError } from '../../../utils/ApiError.js';
import path from 'path';
import fs from 'fs';

export const listPayslips = asyncHandler(async (req, res) => {
  const { runId } = req.params;
  const data = await payslipService.list(runId);
  res.json(new ApiResponse(200, data));
});

export const generatePayslips = asyncHandler(async (req, res) => {
  const result = await payslipService.generate(req.params.runId);
  res.json(new ApiResponse(200, result, 'Payslips generated'));
});

export const publishPayslips = asyncHandler(async (req, res) => {
  const result = await payslipService.publish(req.params.runId);
  res.json(new ApiResponse(200, result, 'Payslips published'));
});

export const getPayslipPreview = asyncHandler(async (req, res) => {
  const payslip = await payslipService.getPayslip(req.params.id);
  res.json(new ApiResponse(200, payslip));
});

export const downloadPayslip = asyncHandler(async (req, res) => {
  const payslip = await payslipService.getPayslip(req.params.id);
  if (!payslip.pdfUrl) {
    throw new ApiError(404, 'PDF not yet generated for this payslip');
  }

  const filePath = path.join(process.cwd(), payslip.pdfUrl);
  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, 'PDF file not found on server');
  }

  res.download(filePath);
});

// Create a payroll run for the given (or current) period and generate payslips for all employees
export const generateAllPayslips = asyncHandler(async (req, res) => {
  // businessId may come from body or from authenticated user
  const businessId = req.body?.businessId || req.user?.businessId;
  if (!businessId) throw new ApiError(400, 'businessId required');

  // allow overriding period, otherwise use current month/year
  const now = new Date();
  const periodMonth = req.body?.periodMonth ? Number(req.body.periodMonth) : (now.getMonth() + 1);
  const periodYear = req.body?.periodYear ? Number(req.body.periodYear) : now.getFullYear();

  // create run (this will compute payroll for all employees and create run items)
  const run = await payrollRunService.createRun(Number(businessId), { periodMonth, periodYear });

  // lock the run to allow payslip generation
  await payrollRunService.lockRun({ businessId: Number(businessId), runId: run.id });

  // if a template override is provided in the request body, forward it so PDFs use the provided template
  const templateOverride = req.body?.templateOverride || null;

  // generate payslips (this will create Payslip rows and PDFs)
  const result = await payslipService.generate(run.id, templateOverride);

  res.json(new ApiResponse(200, { runId: run.id, result }, 'Run created and payslips generated'));
});
