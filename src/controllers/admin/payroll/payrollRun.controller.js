import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { ApiError } from '../../../utils/ApiError.js';
import * as payrollRunService from '../../../services/payroll/payrollRun.service.js';
import payoutService from '../../../services/payroll/payoutService.js';

const resolveBusinessId = (req) => {
  const raw =
    req.get('x-business-id') ||
    req.query?.businessId ||
    req.body?.businessId ||
    req.params?.businessId ||
    req.user?.businessId ||
    req.user?.businessId ||
    req.user?.business_id;

  console.log(`[resolveBusinessId] Headers x-business-id: ${req.get('x-business-id')}`);
  console.log(`[resolveBusinessId] Query/Body/User:`, { query: req.query?.businessId, body: req.body?.businessId, user: req.user?.businessId });

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

  console.log(`[resolveUserId] User:`, req.user ? { id: req.user.id } : 'MISSING');
  console.log(`[resolveUserId] Body[${fieldName}]:`, req.body?.[fieldName]);

  const userId = raw ? Number(raw) : null;

  if (!userId || Number.isNaN(userId)) {
    console.warn(`[resolveUserId] Failed to resolve ${fieldName}. Raw value:`, raw);
    throw new ApiError(401, `Unauthorized: ${fieldName} not found. Login or send ${fieldName}/x-user-id.`);
  }

  return userId;
};

/**
 * List all payroll runs for a business
 */
export const listPayrollRuns = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);

  const filters = {};
  if (req.query.periodMonth) filters.periodMonth = Number(req.query.periodMonth);
  if (req.query.periodYear) filters.periodYear = Number(req.query.periodYear);

  const runs = await payrollRunService.listRuns(businessId, filters);
  return res.json(new ApiResponse(200, runs));
});

/**
 * Create a new payroll run
 */
export const createPayrollRun = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);

  // Support both formats: { period: "2026-01" } or { periodMonth: 1, periodYear: 2026 }
  let periodMonth, periodYear;

  if (req.body.period) {
    // Parse YYYY-MM format
    const [year, month] = req.body.period.split('-').map(Number);
    periodYear = year;
    periodMonth = month;
  } else {
    periodMonth = req.body.periodMonth;
    periodYear = req.body.periodYear;
  }

  try {
    const run = await payrollRunService.createRun(businessId, { periodMonth, periodYear });
    return res.json(new ApiResponse(201, run, 'Payroll run created and calculated'));
  } catch (err) {
    console.error('Error creating payroll run:', err.message);
    throw new ApiError(400, err.message);
  }
});

/**
 * Get a single payroll run
 */
export const getPayrollRun = asyncHandler(async (req, res) => {
  const run = await payrollRunService.getRun(req.params.id);
  if (!run) throw new ApiError(404, 'Payroll run not found');
  return res.json(new ApiResponse(200, run));
});

/**
 * Approve a payroll run
 */
export const approvePayrollRun = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const approvedByUserId = resolveUserId(req, 'approvedBy');

  try {
    const run = await payrollRunService.approveRun({
      businessId,
      runId: Number(req.params.id),
      approvedByUserId,
      approvedAt: req.body?.approvedAt || null,
    });
    return res.json(new ApiResponse(200, run, 'Payroll approved'));
  } catch (err) {
    throw new ApiError(400, err.message);
  }
});

/**
 * Lock a payroll run
 */
export const lockPayrollRun = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const lockedByUserId = resolveUserId(req, 'lockedBy');

  try {
    const run = await payrollRunService.lockRun({
      businessId,
      runId: Number(req.params.id),
      lockedByUserId,
    });
    return res.json(new ApiResponse(200, run, 'Payroll locked'));
  } catch (err) {
    throw new ApiError(400, err.message);
  }
});

/**
 * Update payroll run metadata
 */
export const updatePayrollRun = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const runId = Number(req.params.id);
  const force = !!req.body?.force;
  try {
    const run = await payrollRunService.updateRun({ businessId, runId, payload: req.body, force });
    return res.json(new ApiResponse(200, run, 'Payroll run updated'));
  } catch (err) {
    throw new ApiError(400, err.message);
  }
});

/**
 * Delete a payroll run (hard delete). Pass { force: true } in body to override locked state.
 */
export const deletePayrollRun = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const runId = Number(req.params.id);
  const force = !!req.body?.force || req.query?.force === 'true';
  try {
    await payrollRunService.deleteRun({ businessId, runId, force });
    return res.json(new ApiResponse(200, { runId }, 'Payroll run deleted'));
  } catch (err) {
    throw new ApiError(400, err.message);
  }
});

/**
 * Unlock a locked payroll run (admin/owner only)
 */
export const unlockPayrollRun = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const runId = Number(req.params.id);
  const reason = req.body?.reason || null;
  try {
    const run = await payrollRunService.unlockRun({ businessId, runId, reason });
    return res.json(new ApiResponse(200, run, 'Payroll run unlocked'));
  } catch (err) {
    throw new ApiError(400, err.message);
  }
});

/**
 * Pull inputs for a payroll period - Step 1
 * Returns attendance, leave data summary for review
 */
export const pullInputs = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);

  let periodMonth, periodYear;
  if (req.body.period) {
    const [year, month] = req.body.period.split('-').map(Number);
    periodYear = year;
    periodMonth = month;
  } else {
    periodMonth = req.body.periodMonth;
    periodYear = req.body.periodYear;
  }

  try {
    const inputs = await payrollRunService.pullInputs(businessId, { periodMonth, periodYear });
    return res.json(new ApiResponse(200, inputs, 'Inputs pulled successfully'));
  } catch (err) {
    console.error('Error pulling inputs:', err.message);
    throw new ApiError(400, err.message);
  }
});

/**
 * Initialize a payroll run in Draft status - Step 1b
 */
export const initializePayrollRun = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);

  let periodMonth, periodYear;
  if (req.body.period) {
    const [year, month] = req.body.period.split('-').map(Number);
    periodYear = year;
    periodMonth = month;
  } else {
    periodMonth = req.body.periodMonth;
    periodYear = req.body.periodYear;
  }

  try {
    const run = await payrollRunService.initializeRun(businessId, { periodMonth, periodYear });
    return res.json(new ApiResponse(201, run, 'Payroll run initialized'));
  } catch (err) {
    console.error('Error initializing payroll run:', err.message);
    throw new ApiError(400, err.message);
  }
});

/**
 * Calculate payroll for an existing run - Step 2
 */
export const calculatePayroll = asyncHandler(async (req, res) => {
  const runId = Number(req.params.id);

  try {
    const result = await payrollRunService.calculatePayroll(runId);
    return res.json(new ApiResponse(200, result, 'Payroll calculated successfully'));
  } catch (err) {
    console.error('Error calculating payroll:', err.message);
    throw new ApiError(400, err.message);
  }
});

/**
 * Recalculate payroll for an existing run - refreshes all employees using current salary structures
 * Admin can force recalculate any run regardless of status
 */
export const recalculatePayroll = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const runId = Number(req.params.id);
  const force = !!req.body?.force || req.query?.force === 'true';

  try {
    const result = await payrollRunService.recalculatePayroll(businessId, runId, force);
    return res.json(new ApiResponse(200, result, 'Payroll recalculated successfully'));
  } catch (err) {
    console.error('Error recalculating payroll:', err.message);
    throw new ApiError(400, err.message);
  }
});

/**
 * Publish a locked payroll run - Step 6
 */
export const publishPayrollRun = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const runId = Number(req.params.id);

  try {
    const run = await payrollRunService.publishRun({ businessId, runId });
    return res.json(new ApiResponse(200, run, 'Payroll published'));
  } catch (err) {
    throw new ApiError(400, err.message);
  }
});

/**
 * Process payments for a payroll run
 * This initiates bank transfers to employees
 */
export const processPayments = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const runId = Number(req.params.id);
  const { mode = 'IMPS', dryRun = false } = req.body || {};

  try {
    const results = await payoutService.processPayrollPayments(runId, { mode, dryRun });
    return res.json(new ApiResponse(200, results, dryRun ? 'Payment validation complete' : 'Payments initiated'));
  } catch (err) {
    console.error('Error processing payments:', err.message);
    throw new ApiError(400, err.message);
  }
});

/**
 * Get payment status for a payroll run
 */
export const getPaymentStatus = asyncHandler(async (req, res) => {
  const runId = Number(req.params.id);

  try {
    const statuses = await payoutService.checkPayoutStatus(runId);
    return res.json(new ApiResponse(200, statuses, 'Payment statuses retrieved'));
  } catch (err) {
    throw new ApiError(400, err.message);
  }
});

/**
 * Generate bank transfer file for manual processing
 */
export const generateBankFile = asyncHandler(async (req, res) => {
  const runId = Number(req.params.id);
  const format = req.query.format || 'csv';

  try {
    const file = await payoutService.generateBankFile(runId, format);
    
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.content);
  } catch (err) {
    throw new ApiError(400, err.message);
  }
});

/**
 * Get payout configuration status
 */
export const getPayoutConfig = asyncHandler(async (req, res) => {
  const config = payoutService.getConfigurationStatus();
  return res.json(new ApiResponse(200, config, 'Payout configuration retrieved'));
});
