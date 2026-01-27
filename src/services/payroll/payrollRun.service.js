import { sequelize } from '../../db/index.js';
import PayrollRun from '../../models/payroll.PayrollRun.js';
import PayrollRunItem from '../../models/PayrollRunItem.js';
import { calculateEmployeePayroll } from './payrollCalculation.engine.js';






export const createRun = async (businessId, { period }) => {
  return sequelize.transaction(async (t) => {
    const run = await PayrollRun.create(
      { businessId, period },
      { transaction: t }
    );

    const employeeResults = await calculateEmployeePayroll(businessId, period);

    for (const item of employeeResults) {
      await PayrollRunItem.create(
        { payrollRunId: run.id, ...item },
        { transaction: t }
      );
    }

    await run.update({ status: 'CALCULATED' }, { transaction: t });

    return run;
  });
};

export const getRun = async (id) => {
  return PayrollRun.findByPk(id);
};

export const approveRun = async ({ businessId, runId, approvedByUserId, approvedAt }) => {
  const id = Number(runId);
  if (!id) throw new Error('Invalid runId');

  const run = await PayrollRun.findOne({ where: { id, businessId } });
  if (!run) throw new Error('Payroll run not found');

  await run.update({
    status: 'APPROVED',
    approvedBy: approvedByUserId,
    approvedAt: approvedAt ? new Date(approvedAt) : new Date(),
  });

  return run;
};

export const lockRun = async ({ businessId, runId, lockedByUserId }) => {
  const id = Number(runId);
  if (!id) throw new Error('Invalid runId');

  const run = await PayrollRun.findOne({ where: { id, businessId } });
  if (!run) throw new Error('Payroll run not found');

  await run.update({
    status: 'LOCKED',
    lockedAt: new Date(),
  });

  return run;
};

export const getRegister = async (runId) => {
  return PayrollRunItem.findAll({ where: { payrollRunId: runId } });
};
