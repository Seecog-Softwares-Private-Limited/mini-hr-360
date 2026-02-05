// src/services/payroll/payoutService.js
/**
 * PayoutService - Handles salary payments to employees via RazorpayX or bank transfers
 * 
 * This service supports two modes:
 * 1. RazorpayX Payouts - Automated bank transfers via Razorpay's payout API
 * 2. Manual/Batch - Generate bank transfer file for manual upload to corporate banking
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import EmployeeBankDetail from '../../models/EmployeeBankDetail.js';
import Employee from '../../models/Employee.js';
import { PayrollRun, PayrollRunItem } from '../../models/index.js';
import sequelize from '../../db/index.js';

// RazorpayX API base URLs
const RAZORPAYX_BASE_URL = process.env.RAZORPAYX_BASE_URL || 'https://api.razorpay.com/v1';

class PayoutService {
  constructor() {
    this.keyId = process.env.RAZORPAYX_KEY_ID || process.env.RAZORPAY_KEY_ID;
    this.keySecret = process.env.RAZORPAYX_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    this.accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;
    this.initialized = false;
  }

  /**
   * Check if RazorpayX is configured for payouts
   */
  isConfigured() {
    return !!(this.keyId && this.keySecret && this.accountNumber);
  }

  /**
   * Get auth headers for RazorpayX API
   */
  getAuthHeaders() {
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Create a fund account for an employee (required before payout)
   * Fund accounts link employee bank details to RazorpayX
   */
  async createFundAccount(employee, bankDetails) {
    if (!this.isConfigured()) {
      console.warn('[PayoutService] RazorpayX not configured, skipping fund account creation');
      return null;
    }

    try {
      // First create a contact (represents the payee)
      const contactRes = await fetch(`${RAZORPAYX_BASE_URL}/contacts`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          name: bankDetails.accountHolderName || `${employee.firstName} ${employee.lastName}`,
          email: employee.empEmail || employee.email,
          contact: employee.empPhone || employee.phone,
          type: 'employee',
          reference_id: `EMP_${employee.id}`,
          notes: {
            employeeId: employee.id.toString(),
            employeeCode: employee.empId || employee.id
          }
        })
      });

      if (!contactRes.ok) {
        const err = await contactRes.json();
        throw new Error(err.error?.description || 'Failed to create contact');
      }

      const contact = await contactRes.json();

      // Create fund account for bank transfer
      const fundAccountRes = await fetch(`${RAZORPAYX_BASE_URL}/fund_accounts`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          contact_id: contact.id,
          account_type: 'bank_account',
          bank_account: {
            name: bankDetails.accountHolderName,
            ifsc: bankDetails.ifscCode,
            account_number: bankDetails.accountNumber
          }
        })
      });

      if (!fundAccountRes.ok) {
        const err = await fundAccountRes.json();
        throw new Error(err.error?.description || 'Failed to create fund account');
      }

      const fundAccount = await fundAccountRes.json();

      // Store fund account ID in employee bank details for future use
      await EmployeeBankDetail.update(
        { 
          razorpayContactId: contact.id,
          razorpayFundAccountId: fundAccount.id 
        },
        { where: { employeeId: employee.id } }
      );

      return { contactId: contact.id, fundAccountId: fundAccount.id };
    } catch (error) {
      console.error(`[PayoutService] Failed to create fund account for employee ${employee.id}:`, error);
      throw error;
    }
  }

  /**
   * Initiate a payout to an employee's bank account
   */
  async createPayout({ fundAccountId, amount, currency = 'INR', mode = 'IMPS', purpose = 'salary', reference, notes = {} }) {
    if (!this.isConfigured()) {
      throw new Error('RazorpayX not configured for payouts');
    }

    try {
      const res = await fetch(`${RAZORPAYX_BASE_URL}/payouts`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          account_number: this.accountNumber,
          fund_account_id: fundAccountId,
          amount: Math.round(amount * 100), // Convert to paise
          currency,
          mode, // NEFT, RTGS, IMPS, UPI
          purpose, // salary, vendor_bill, etc.
          queue_if_low_balance: true,
          reference_id: reference,
          narration: `Salary for ${notes.period || 'current period'}`,
          notes
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.description || 'Payout failed');
      }

      return await res.json();
    } catch (error) {
      console.error('[PayoutService] Payout failed:', error);
      throw error;
    }
  }

  /**
   * Process payroll payments for a run
   * @param {number} runId - Payroll run ID
   * @param {Object} options - Payment options
   * @returns {Object} Payment results
   */
  async processPayrollPayments(runId, options = {}) {
    const { mode = 'IMPS', dryRun = false } = options;

    const run = await PayrollRun.findByPk(runId);

    if (!run) throw new Error('Payroll run not found');
    // Allow processing when the run is Locked, Published, or Paid (after payslip generation)
    if (!['Locked', 'Published', 'Paid'].includes(run.status)) {
      throw new Error(`Run must be Locked or Published before processing payments (current: ${run.status})`);
    }

    const results = {
      runId,
      totalEmployees: 0,
      successful: [],
      failed: [],
      skipped: [],
      totalAmount: 0,
      processedAmount: 0,
      mode: this.isConfigured() ? 'razorpayx' : 'manual',
      dryRun
    };

    // Get all payroll items with employee details
    const items = await PayrollRunItem.findAll({
      where: { payrollRunId: runId },
      include: [
        { 
          model: Employee,
          attributes: ['id', 'firstName', 'lastName', 'empId', 'empEmail', 'empPhone']
        }
      ]
    });

    results.totalEmployees = items.length;

    for (const item of items) {
      const employee = item.Employee;
      if (!employee) {
        results.skipped.push({ 
          itemId: item.id, 
          reason: 'Employee not found' 
        });
        continue;
      }

      const netPay = Number(item.netPay || 0);
      if (netPay <= 0) {
        results.skipped.push({ 
          employeeId: employee.id, 
          name: `${employee.firstName} ${employee.lastName}`,
          reason: 'Zero or negative net pay' 
        });
        continue;
      }

      results.totalAmount += netPay;

      // Get bank details
      const bankDetails = await EmployeeBankDetail.findOne({
        where: { employeeId: employee.id }
      });

      if (!bankDetails || !bankDetails.accountNumber || !bankDetails.ifscCode) {
        results.skipped.push({ 
          employeeId: employee.id, 
          name: `${employee.firstName} ${employee.lastName}`,
          reason: 'Bank details not configured' 
        });
        continue;
      }

      if (dryRun) {
        // Dry run - just validate
        results.successful.push({
          employeeId: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          amount: netPay,
          accountNumber: bankDetails.accountNumber.slice(-4).padStart(bankDetails.accountNumber.length, '*'),
          status: 'validated'
        });
        results.processedAmount += netPay;
        continue;
      }

      // Process actual payment
      if (this.isConfigured()) {
        try {
          // Ensure fund account exists
          let fundAccountId = bankDetails.razorpayFundAccountId;
          if (!fundAccountId) {
            const fundAccount = await this.createFundAccount(employee, bankDetails);
            fundAccountId = fundAccount?.fundAccountId;
          }

          if (!fundAccountId) {
            throw new Error('Could not create fund account');
          }

          // Create payout
          const payout = await this.createPayout({
            fundAccountId,
            amount: netPay,
            mode,
            purpose: 'salary',
            reference: `SAL_${runId}_${employee.id}_${Date.now()}`,
            notes: {
              employeeId: employee.id.toString(),
              runId: runId.toString(),
              period: `${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}`
            }
          });

          // Update item with payment details
          await item.update({
            paymentStatus: 'processing',
            paymentId: payout.id,
            paymentMode: mode,
            paymentInitiatedAt: new Date()
          });

          results.successful.push({
            employeeId: employee.id,
            name: `${employee.firstName} ${employee.lastName}`,
            amount: netPay,
            payoutId: payout.id,
            status: payout.status,
            utr: payout.utr
          });
          results.processedAmount += netPay;

        } catch (error) {
          results.failed.push({
            employeeId: employee.id,
            name: `${employee.firstName} ${employee.lastName}`,
            amount: netPay,
            error: error.message
          });
        }
      } else {
        // Manual mode - mark for bank file generation
        results.successful.push({
          employeeId: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          amount: netPay,
          bankName: bankDetails.bankName,
          accountNumber: bankDetails.accountNumber,
          ifsc: bankDetails.ifscCode,
          accountHolder: bankDetails.accountHolderName,
          status: 'pending_manual'
        });
        results.processedAmount += netPay;
      }
    }

    // Update run with payment summary
    if (!dryRun) {
      await run.update({
        paymentStatus: results.failed.length > 0 ? 'partial' : 'initiated',
        paymentInitiatedAt: new Date(),
        paymentSummary: JSON.stringify(results)
      });
    }

    return results;
  }

  /**
   * Generate bank transfer file for manual processing
   * Supports multiple formats: CSV, HDFC, ICICI, etc.
   */
  async generateBankFile(runId, format = 'csv') {
    const items = await PayrollRunItem.findAll({
      where: { payrollRunId: runId },
      include: [
        { 
          model: Employee,
          attributes: ['id', 'firstName', 'lastName', 'empId']
        }
      ]
    });

    const rows = [];
    
    for (const item of items) {
      const employee = item.Employee;
      if (!employee) continue;

      const bankDetails = await EmployeeBankDetail.findOne({
        where: { employeeId: employee.id }
      });

      if (!bankDetails || !bankDetails.accountNumber) continue;

      const netPay = Number(item.netPay || 0);
      if (netPay <= 0) continue;

      rows.push({
        srNo: rows.length + 1,
        employeeCode: employee.empId || employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        accountNumber: bankDetails.accountNumber,
        ifscCode: bankDetails.ifscCode,
        bankName: bankDetails.bankName || '',
        branchName: bankDetails.branchName || '',
        amount: netPay.toFixed(2),
        narration: `Salary`
      });
    }

    if (format === 'csv') {
      const headers = ['Sr No', 'Employee Code', 'Employee Name', 'Account Number', 'IFSC Code', 'Bank Name', 'Branch', 'Amount', 'Narration'];
      const csvRows = [headers.join(',')];
      
      for (const row of rows) {
        csvRows.push([
          row.srNo,
          row.employeeCode,
          `"${row.employeeName}"`,
          row.accountNumber,
          row.ifscCode,
          `"${row.bankName}"`,
          `"${row.branchName}"`,
          row.amount,
          row.narration
        ].join(','));
      }

      return {
        filename: `salary_transfer_${runId}_${Date.now()}.csv`,
        content: csvRows.join('\n'),
        mimeType: 'text/csv',
        totalAmount: rows.reduce((sum, r) => sum + parseFloat(r.amount), 0),
        employeeCount: rows.length
      };
    }

    // HDFC format
    if (format === 'hdfc') {
      const lines = rows.map(r => 
        `${r.accountNumber.padEnd(20)}${r.ifscCode.padEnd(15)}${(r.amount * 100).toString().padStart(15, '0')}${r.employeeName.substring(0, 35).padEnd(35)}${r.narration.padEnd(20)}`
      );
      
      return {
        filename: `hdfc_salary_${runId}_${Date.now()}.txt`,
        content: lines.join('\n'),
        mimeType: 'text/plain',
        totalAmount: rows.reduce((sum, r) => sum + parseFloat(r.amount), 0),
        employeeCount: rows.length
      };
    }

    throw new Error(`Unsupported format: ${format}`);
  }

  /**
   * Check payout status for a run
   */
  async checkPayoutStatus(runId) {
    const items = await PayrollRunItem.findAll({
      where: { 
        payrollRunId: runId,
        paymentId: { [sequelize.Sequelize.Op.ne]: null }
      }
    });

    const statuses = [];
    
    for (const item of items) {
      if (!item.paymentId) continue;

      try {
        const res = await fetch(`${RAZORPAYX_BASE_URL}/payouts/${item.paymentId}`, {
          headers: this.getAuthHeaders()
        });

        if (res.ok) {
          const payout = await res.json();
          statuses.push({
            itemId: item.id,
            employeeId: item.employeeId,
            payoutId: item.paymentId,
            status: payout.status,
            utr: payout.utr,
            processedAt: payout.processed_at,
            failureReason: payout.failure_reason
          });

          // Update item status
          await item.update({
            paymentStatus: payout.status,
            paymentUtr: payout.utr
          });
        }
      } catch (error) {
        console.error(`[PayoutService] Failed to check status for payout ${item.paymentId}:`, error);
      }
    }

    return statuses;
  }

  /**
   * Get payout configuration status
   */
  getConfigurationStatus() {
    return {
      razorpayxConfigured: this.isConfigured(),
      keyIdConfigured: !!this.keyId,
      keySecretConfigured: !!this.keySecret,
      accountNumberConfigured: !!this.accountNumber,
      mode: this.isConfigured() ? 'automated' : 'manual'
    };
  }
}

// Export singleton
const payoutService = new PayoutService();
export { payoutService, PayoutService };
export default payoutService;
