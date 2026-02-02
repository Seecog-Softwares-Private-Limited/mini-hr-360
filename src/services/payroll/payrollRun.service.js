import { sequelize } from '../../db/index.js';
import { Op } from 'sequelize';
import * as Models from '../../models/index.js';
import { calculateEmployeePayroll } from './payrollCalculation.engine.js';

const { PayrollRun, PayrollRunItem, Employee, AttendanceDailySummary, LeaveRequest } = Models;

console.log('[PayrollRunService] Initializing. Models availability:', {
  PayrollRun: !!PayrollRun,
  PayrollRunItem: !!PayrollRunItem,
  Employee: !!Employee
});

export const listRuns = async (businessId, filters = {}) => {
  return PayrollRun.findAll({
    where: { businessId, ...filters },
    order: [['periodYear', 'DESC'], ['periodMonth', 'DESC']],
  });
};

export const createRun = async (businessId, { periodMonth, periodYear }) => {
  const month = Number(periodMonth);
  const year = Number(periodYear);
  const period = `${year}-${String(month).padStart(2, '0')}`;
  return sequelize.transaction(async (t) => {
    const run = await PayrollRun.create({ businessId, periodMonth: month, periodYear: year, status: 'Draft' }, { transaction: t });
    const employeeResults = await calculateEmployeePayroll(businessId, period);
    for (const item of employeeResults) {
      await PayrollRunItem.create({ payrollRunId: run.id, ...item }, { transaction: t });
    }
    const totalEarnings = employeeResults.reduce((s, i) => s + Number(i.grossPay || 0), 0);
    const totalDeductions = employeeResults.reduce((s, i) => s + Number(i.totalDeductions || 0), 0);
    const totalNetPay = totalEarnings - totalDeductions;
    await run.update({ status: 'Processing', totalEarnings, totalDeductions, totalNetPay, employeeCount: employeeResults.length }, { transaction: t });
    return run;
  });
};

export const getRun = async (id) => PayrollRun.findByPk(id);

export const approveRun = async ({ businessId, runId }) => {
  const run = await PayrollRun.findOne({ where: { id: runId, businessId } });
  if (!run) throw new Error('Run not found');
  await run.update({ status: 'Approved' });
  return run;
};

export const lockRun = async ({ businessId, runId }) => {
  const run = await PayrollRun.findOne({ where: { id: runId, businessId } });
  if (!run) throw new Error('Run not found');
  await run.update({ status: 'Locked' });
  return run;
};

export const getRegister = async (runId) => {
  try {
    console.log(`[PayrollRunService] getRegister called for runId: ${runId}`);

    if (!PayrollRun) throw new Error('PayrollRun model is not defined in service');

    const run = await PayrollRun.findByPk(runId);
    if (!run) throw new Error('Payroll run not found');

    console.log(`[PayrollRunService] Found run. Status: ${run.status}. Fetching items...`);

    if (!PayrollRunItem) throw new Error('PayrollRunItem model is not defined in service');
    if (!Employee) throw new Error('Employee model is not defined in service');

    const items = await PayrollRunItem.findAll({
      where: { payrollRunId: runId },
      include: [{
        model: Employee,
        attributes: ['empName', 'empId', 'empDepartment']
      }]
    });

    console.log(`[PayrollRunService] Found ${items.length} items.`);

    return {
      runId: run.id,
      period: `${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}`,
      status: run.status,
      stats: {
        employeeCount: run.employeeCount,
        totalEarnings: run.totalEarnings,
        totalDeductions: run.totalDeductions,
        netPay: run.totalNetPay,
      },
      employees: items.map(item => ({
        id: item.id,
        empId: item.Employee?.empId || '-',
        empName: item.Employee?.empName || '-',
        department: item.Employee?.empDepartment || '-',
        lopDays: item.lopDays,
        earnings: item.grossPay,
        deductions: item.totalDeductions,
        netPay: item.netPay,
        earningsJson: item.earnings,
        deductionsJson: item.deductions,
        exceptions: []
      }))
    };
  } catch (error) {
    console.error('[PayrollRunService] Error in getRegister:', error);
    throw error;
  }
};

export const addAdjustment = async ({ itemId, type, amount, description }) => {
  const item = await PayrollRunItem.findByPk(itemId);
  const run = await PayrollRun.findByPk(item.payrollRunId);
  return sequelize.transaction(async (t) => {
    const earnings = { ...item.earnings };
    const deductions = { ...item.deductions };
    const val = Number(amount);
    if (type === 'deduction' || type === 'recovery') deductions[description || type] = val;
    else earnings[description || type] = val;
    const grossPay = Object.values(earnings).reduce((s, v) => s + Number(v), 0);
    const totalDeductions = Object.values(deductions).reduce((s, v) => s + Number(v), 0);
    const netPay = grossPay - totalDeductions;
    await item.update({ earnings, deductions, grossPay, totalDeductions, netPay }, { transaction: t });
    const allItems = await PayrollRunItem.findAll({ where: { payrollRunId: run.id }, transaction: t });
    await run.update({
      totalEarnings: allItems.reduce((s, i) => s + Number(i.grossPay), 0),
      totalDeductions: allItems.reduce((s, i) => s + Number(i.totalDeductions), 0),
      totalNetPay: allItems.reduce((s, i) => s + Number(i.netPay), 0)
    }, { transaction: t });
    return item;
  });
};

export const updateRun = async ({ businessId, runId, payload = {}, force = false }) => {
  const run = await PayrollRun.findByPk(runId);
  if (!run) throw new Error('Run not found');
  if (Number(businessId) && run.businessId !== Number(businessId)) throw new Error('Unauthorized: business mismatch');
  if (run.status === 'Locked' && !force) throw new Error('Cannot modify a locked run');

  // Only allow updating a small set of metadata to avoid corrupting computed results
  const allowed = ['notes', 'processedDate', 'periodMonth', 'periodYear'];
  const updates = {};
  for (const k of allowed) if (Object.prototype.hasOwnProperty.call(payload, k)) updates[k] = payload[k];

  return sequelize.transaction(async (t) => {
    await run.update(updates, { transaction: t });
    return run;
  });
};

export const deleteRun = async ({ businessId, runId, force = false }) => {
  const run = await PayrollRun.findByPk(runId);
  if (!run) throw new Error('Run not found');
  if (Number(businessId) && run.businessId !== Number(businessId)) throw new Error('Unauthorized: business mismatch');
  if (run.status === 'Locked' && !force) throw new Error('Cannot delete a locked run. Unlock or pass force=true');

  return sequelize.transaction(async (t) => {
    // delete dependent records in safe order
    try {
      await Models.PayrollRunItem.destroy({ where: { payrollRunId: runId }, transaction: t });
    } catch (e) {
      console.warn('Error deleting PayrollRunItem:', e.message);
    }
    try {
      if (Models.Payslip) await Models.Payslip.destroy({ where: { payrollRunId: runId }, transaction: t });
    } catch (e) { console.warn('Error deleting Payslips:', e.message); }
    try {
      if (Models.PayrollRegister) await Models.PayrollRegister.destroy({ where: { payrollRunId: runId }, transaction: t });
    } catch (e) { console.warn('Error deleting PayrollRegister:', e.message); }
    try {
      if (Models.PayrollQuery) await Models.PayrollQuery.destroy({ where: { payrollRunId: runId }, transaction: t });
    } catch (e) { console.warn('Error deleting PayrollQuery:', e.message); }
    try {
      if (Models.StatutoryCompliance) await Models.StatutoryCompliance.destroy({ where: { payrollRunId: runId }, transaction: t });
    } catch (e) { console.warn('Error deleting StatutoryCompliance:', e.message); }

    await run.destroy({ transaction: t });

    // simple audit trail via console (could be extended to DB audit table)
    console.log(`PayrollRun ${runId} deleted by request (businessId=${businessId}, force=${force})`);
    return true;
  });
};

export const unlockRun = async ({ businessId, runId, reason = null }) => {
  const run = await PayrollRun.findByPk(runId);
  if (!run) throw new Error('Run not found');
  if (Number(businessId) && run.businessId !== Number(businessId)) throw new Error('Unauthorized: business mismatch');
  if (run.status !== 'Locked') throw new Error('Only locked runs can be unlocked');

  return sequelize.transaction(async (t) => {
    await run.update({ status: 'Approved' }, { transaction: t });
    console.log(`PayrollRun ${runId} unlocked (reason=${reason})`);
    return run;
  });
};

/**
 * Pull Inputs Step - Fetches attendance and leave data for the period
 * Returns a summary of data pulled for review before calculation
 */
export const pullInputs = async (businessId, { periodMonth, periodYear }) => {
  const month = Number(periodMonth);
  const year = Number(periodYear);
  const period = `${year}-${String(month).padStart(2, '0')}`;
  
  // Calculate date range for the period
  const startDate = `${period}-01`;
  const endDate = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10); // Last day of month
  
  console.log(`[PullInputs] Fetching data for period ${period} (${startDate} to ${endDate})`);

  // Fetch all employees for this business
  const employees = await Employee.findAll({ 
    where: { businessId },
    attributes: ['id', 'empId', 'empName', 'empDepartment', 'empCtc', 'empDateOfJoining', 'lastWorkingDay']
  });
  
  // Fetch attendance data for the period
  const attendanceData = await AttendanceDailySummary.findAll({
    where: {
      businessId,
      date: { [Op.between]: [startDate, endDate] }
    },
    attributes: ['employeeId', 'date', 'status', 'workMinutes', 'lateMinutes', 'overtimeMinutes']
  });

  // Fetch approved leave requests for the period
  const leaveData = await LeaveRequest.findAll({
    where: {
      businessId,
      status: 'APPROVED',
      [Op.or]: [
        { startDate: { [Op.between]: [startDate, endDate] } },
        { endDate: { [Op.between]: [startDate, endDate] } },
        { [Op.and]: [{ startDate: { [Op.lte]: startDate } }, { endDate: { [Op.gte]: endDate } }] }
      ]
    },
    attributes: ['employeeId', 'startDate', 'endDate', 'totalDays', 'leaveTypeId', 'isHalfDayStart', 'isHalfDayEnd']
  });

  // Aggregate data per employee
  const employeeSummaries = employees.map(emp => {
    const empAttendance = attendanceData.filter(a => a.employeeId === emp.id);
    const empLeaves = leaveData.filter(l => l.employeeId === emp.id);
    
    // Count attendance statuses
    const presentDays = empAttendance.filter(a => ['PRESENT', 'LATE'].includes(a.status)).length;
    const absentDays = empAttendance.filter(a => a.status === 'ABSENT').length;
    const halfDays = empAttendance.filter(a => a.status === 'HALF_DAY').length;
    const weekoffs = empAttendance.filter(a => a.status === 'WEEKOFF').length;
    const holidays = empAttendance.filter(a => a.status === 'HOLIDAY').length;
    const leaveDays = empAttendance.filter(a => a.status === 'LEAVE').length;
    const totalOvertimeMinutes = empAttendance.reduce((sum, a) => sum + (a.overtimeMinutes || 0), 0);
    const totalLateMinutes = empAttendance.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
    
    // Calculate total approved leave days
    const approvedLeaveDays = empLeaves.reduce((sum, l) => sum + Number(l.totalDays || 0), 0);

    return {
      employeeId: emp.id,
      empId: emp.empId,
      empName: emp.empName,
      department: emp.empDepartment,
      ctc: emp.empCtc,
      attendance: {
        presentDays,
        absentDays,
        halfDays,
        weekoffs,
        holidays,
        leaveDays,
        overtimeHours: Math.round(totalOvertimeMinutes / 60 * 100) / 100,
        lateHours: Math.round(totalLateMinutes / 60 * 100) / 100
      },
      leaves: {
        count: empLeaves.length,
        totalDays: approvedLeaveDays
      },
      hasExceptions: absentDays > 3 || totalLateMinutes > 300 // Flag exceptions
    };
  });

  // Calculate totals
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const workingDays = totalDaysInMonth - (employeeSummaries[0]?.attendance?.weekoffs || 0) - (employeeSummaries[0]?.attendance?.holidays || 0);
  
  return {
    period,
    startDate,
    endDate,
    totalDaysInMonth,
    estimatedWorkingDays: workingDays,
    employeeCount: employees.length,
    attendanceRecords: attendanceData.length,
    leaveRecords: leaveData.length,
    employees: employeeSummaries,
    exceptions: employeeSummaries.filter(e => e.hasExceptions).map(e => ({
      empId: e.empId,
      empName: e.empName,
      reason: e.attendance.absentDays > 3 ? `${e.attendance.absentDays} absent days` : `${e.attendance.lateHours}hrs late`
    })),
    pulledAt: new Date().toISOString()
  };
};

/**
 * Create a payroll run in Draft status (Step 1)
 */
export const initializeRun = async (businessId, { periodMonth, periodYear }) => {
  const month = Number(periodMonth);
  const year = Number(periodYear);
  
  // Check if run already exists for this period
  const existing = await PayrollRun.findOne({
    where: { businessId, periodMonth: month, periodYear: year }
  });
  
  if (existing) {
    throw new Error(`Payroll run already exists for ${year}-${String(month).padStart(2, '0')}. Delete or edit the existing run.`);
  }

  const run = await PayrollRun.create({
    businessId,
    periodMonth: month,
    periodYear: year,
    status: 'Draft',
    employeeCount: 0,
    totalEarnings: 0,
    totalDeductions: 0,
    totalNetPay: 0
  });

  return run;
};

/**
 * Calculate payroll for an existing run (Step 2)
 */
export const calculatePayroll = async (runId) => {
  const run = await PayrollRun.findByPk(runId);
  if (!run) throw new Error('Run not found');
  if (!['Draft', 'Processing'].includes(run.status)) {
    throw new Error('Can only calculate payroll for Draft or Processing runs');
  }

  const period = `${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}`;
  
  return sequelize.transaction(async (t) => {
    // Clear any existing items
    await PayrollRunItem.destroy({ where: { payrollRunId: run.id }, transaction: t });
    
    // Calculate payroll for all employees
    const employeeResults = await calculateEmployeePayroll(run.businessId, period);
    
    // Create payroll run items
    for (const item of employeeResults) {
      await PayrollRunItem.create({ payrollRunId: run.id, ...item }, { transaction: t });
    }
    
    // Update run totals
    const totalEarnings = employeeResults.reduce((s, i) => s + Number(i.grossPay || 0), 0);
    const totalDeductions = employeeResults.reduce((s, i) => s + Number(i.totalDeductions || 0), 0);
    const totalNetPay = totalEarnings - totalDeductions;
    
    await run.update({
      status: 'Processing',
      totalEarnings,
      totalDeductions,
      totalNetPay,
      employeeCount: employeeResults.length,
      processedDate: new Date()
    }, { transaction: t });
    
    return {
      runId: run.id,
      status: 'Processing',
      employeeCount: employeeResults.length,
      totalEarnings,
      totalDeductions,
      totalNetPay,
      employees: employeeResults
    };
  });
};

/**
 * Publish a locked run - mark as Paid (Step 6)
 */
export const publishRun = async ({ businessId, runId }) => {
  const run = await PayrollRun.findOne({ where: { id: runId, businessId } });
  if (!run) throw new Error('Run not found');
  if (run.status !== 'Locked') throw new Error('Only locked runs can be published');

  return sequelize.transaction(async (t) => {
    await run.update({ 
      status: 'Paid'
    }, { transaction: t });
    
    return run;
  });
};

/**
 * Recalculate payroll for an existing run - refreshes all employees using current salary structures
 * This is useful when salary structures have been updated and you need to refresh the payroll data
 * Admin can force recalculate any run regardless of status
 */
export const recalculatePayroll = async (businessId, runId, force = false) => {
  const run = await PayrollRun.findByPk(runId);
  if (!run) throw new Error('Run not found');
  if (Number(businessId) && run.businessId !== Number(businessId)) throw new Error('Unauthorized: business mismatch');
  
  // Allow recalculation for any status when force=true (admin action)
  if (!force && !['Draft', 'Processing', 'Calculated'].includes(run.status)) {
    throw new Error(`Cannot recalculate a ${run.status} run. Use force=true or unlock the run first.`);
  }

  const period = `${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}`;
  
  return sequelize.transaction(async (t) => {
    // Clear existing items
    await PayrollRunItem.destroy({ where: { payrollRunId: run.id }, transaction: t });
    
    // Recalculate payroll for all employees using current salary structures
    const employeeResults = await calculateEmployeePayroll(run.businessId, period);
    
    // Create new payroll run items
    for (const item of employeeResults) {
      await PayrollRunItem.create({ payrollRunId: run.id, ...item }, { transaction: t });
    }
    
    // Update run totals
    const totalEarnings = employeeResults.reduce((s, i) => s + Number(i.grossPay || 0), 0);
    const totalDeductions = employeeResults.reduce((s, i) => s + Number(i.totalDeductions || 0), 0);
    const totalNetPay = totalEarnings - totalDeductions;
    
    // Reset status to Processing so it can go through approval flow again
    await run.update({
      status: 'Processing',
      totalEarnings,
      totalDeductions,
      totalNetPay,
      employeeCount: employeeResults.length,
      processedDate: new Date()
    }, { transaction: t });
    
    console.log(`[PayrollRunService] Recalculated run ${runId} - ${employeeResults.length} employees, total net pay: ${totalNetPay}`);
    
    return {
      runId: run.id,
      status: 'Processing',
      employeeCount: employeeResults.length,
      totalEarnings,
      totalDeductions,
      totalNetPay,
      message: 'Payroll recalculated successfully with latest salary structures'
    };
  });
};
