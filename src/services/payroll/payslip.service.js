import { Payslip, PayrollRun, PayrollRunItem, Employee, EmployeeBankDetail, Department } from '../../models/index.js';
import { generatePayslipPdf } from './payslipPdf.service.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Generate payslips for a locked payroll run
 */
export const generate = async (runId, templateOverride = null) => {
  const payrollRun = await PayrollRun.findByPk(runId);

  if (!payrollRun) {
    throw new ApiError(404, 'Payroll run not found');
  }

  // Only allow generation if Locked (standard payroll practice)
  if (payrollRun.status !== 'Locked') {
    throw new ApiError(400, 'Payslips can only be generated after payroll is locked');
  }

  // Check if payslips already exist to avoid duplicates
  const existingCount = await Payslip.count({ where: { payrollRunId: runId } });
  if (existingCount > 0) {
    throw new ApiError(400, 'Payslips have already been generated for this payroll run');
  }

  const items = await PayrollRunItem.findAll({ where: { payrollRunId: runId } });
  let generatedCount = 0;

  for (const item of items) {
    const payslip = await Payslip.create({
      payrollRunId: runId,
      employeeId: item.employeeId,
      periodMonth: payrollRun.periodMonth,
      periodYear: payrollRun.periodYear,
      earnings: item.earnings,
      deductions: item.deductions,
      netPay: item.netPay,
      status: 'Published', // Default to Published for simplicity, or Held if requirements differ
      publishedAt: new Date()
    });

    // Optional: Generate PDF immediately
    try {
      const pdfUrl = await generatePayslipPdf(payslip.id, templateOverride);
      await payslip.update({ pdfUrl });
    } catch (pdfErr) {
      console.error(`Failed to generate PDF for payslip ${payslip.id}:`, pdfErr);
    }

    generatedCount++;
  }

  return { count: generatedCount, message: 'Payslips generated successfully' };
};

/**
 * List payslips for a run with employee details
 */
export const list = async (runId) => {
  const payslips = await Payslip.findAll({
    where: { payrollRunId: runId },
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['empName', 'empId', 'empDepartment'],
        include: [{ model: EmployeeBankDetail, as: 'bankDetails', attributes: ['id'] }]
      }
    ]
  });

  return payslips.map(ps => ({
    id: ps.id,
    empName: ps.employee?.empName || 'Unknown',
    empId: ps.employee?.empId || '-',
    department: ps.employee?.empDepartment || '-',
    netPay: ps.netPay,
    bankStatus: !!ps.employee?.bankDetails,
    status: ps.status,
    pdfUrl: ps.pdfUrl
  }));
};

/**
 * Publish all generated payslips for a run
 */
export const publish = async (runId) => {
  const [updatedCount] = await Payslip.update(
    { status: 'Published', publishedAt: new Date() },
    { where: { payrollRunId: runId, status: 'Held' } }
  );
  return { updatedCount };
};

/**
 * Get single payslip for preview
 */
export const getPayslip = async (id) => {
  const payslip = await Payslip.findByPk(id, {
    include: [
      {
        model: Employee,
        as: 'employee',
        include: [{ model: EmployeeBankDetail, as: 'bankDetails' }]
      },
      { model: PayrollRun, as: 'payrollRun' }
    ]
  });
  if (!payslip) throw new ApiError(404, 'Payslip not found');
  return payslip;
};
