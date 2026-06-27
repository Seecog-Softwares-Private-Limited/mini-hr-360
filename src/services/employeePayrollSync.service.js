import EmployeeSalaryStructure from '../models/EmployeeSalaryStructure.js';
import { generateSalaryBreakup } from '../utils/salaryBreakup.util.js';

/**
 * Sync employee CTC into active salary structure record (create or update).
 */
export async function syncEmployeeSalaryStructure({
  employeeId,
  ctc,
  effectiveDate = null,
  reason = 'ctc_update',
}) {
  const annualCtc = Number(ctc);
  if (!employeeId || !Number.isFinite(annualCtc) || annualCtc < 0) {
    throw new Error('Invalid employeeId or CTC for payroll sync');
  }

  const eff = effectiveDate || new Date().toISOString().slice(0, 10);
  const breakup = generateSalaryBreakup(annualCtc);

  const existing = await EmployeeSalaryStructure.findOne({
    where: { employeeId, isActive: true },
    order: [['effectiveDate', 'DESC']],
  });

  if (existing && Number(existing.ctc) === annualCtc) {
    return { action: 'unchanged', record: existing };
  }

  if (existing) {
    await existing.update({ isActive: false });
  }

  const record = await EmployeeSalaryStructure.create({
    employeeId,
    salaryStructureId: existing?.salaryStructureId || null,
    effectiveDate: eff,
    ctc: annualCtc,
    breakup,
    isActive: true,
  });

  return { action: existing ? 'replaced' : 'created', record, reason };
}
