import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { ApiError } from '../../../utils/ApiError.js';
import * as payrollSetupService from '../../../services/payroll/payrollSetup.service.js';
import { resolveTenantBusinessId } from '../../../utils/tenantContext.util.js';

const resolveBusinessId = (req) => resolveTenantBusinessId(req);

export const getPayrollSetup = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  const setup = await payrollSetupService.getSetup(businessId);
  return res.json(new ApiResponse(200, setup));
});

export const savePayrollSetup = asyncHandler(async (req, res) => {
  const businessId = await resolveBusinessId(req);
  try {
    const saved = await payrollSetupService.saveSetup(businessId, req.body);
    return res.json(new ApiResponse(200, saved, 'Payroll setup saved'));
  } catch (err) {
    console.error('Error saving payroll setup:', err && (err.message || err));
    if (err.sql) console.error('SQL:', err.sql);
    throw err; // let asyncHandler / errorMiddleware send response
  }
});

// Test payment endpoint - simulates penny testing for bank verification
export const testPayment = asyncHandler(async (req, res) => {
  const { accountNumber, ifsc, accountHolder, amount } = req.body;
  
  if (!accountNumber || !ifsc || !accountHolder) {
    throw new ApiError(400, 'Missing required bank details: accountNumber, ifsc, accountHolder');
  }
  
  // In production, this would integrate with a payment gateway (Razorpay, Cashfree, etc.)
  // For now, we simulate a successful penny test
  const mockUtr = 'PENNYTEST' + Date.now().toString().slice(-10);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Validate IFSC format (basic check)
  const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscPattern.test(ifsc.toUpperCase())) {
    return res.json({
      success: false,
      message: 'Invalid IFSC code format',
      utr: null,
      status: 'FAILED'
    });
  }
  
  // Simulate successful test payment
  return res.json({
    success: true,
    message: 'Test payment of ₹' + (amount || 1) + ' initiated successfully',
    utr: mockUtr,
    status: 'PROCESSING',
    details: {
      accountNumber: accountNumber.slice(-4).padStart(accountNumber.length, '*'),
      ifsc: ifsc.toUpperCase(),
      accountHolder: accountHolder.toUpperCase(),
      amount: amount || 1,
      timestamp: new Date().toISOString()
    }
  });
});