import { Op } from 'sequelize';
import * as Models from '../../models/index.js';
import { calculateStatutoryDeductions } from './statutory.engine.js';

const {
  Employee,
  EmployeeSalaryAssignment,
  SalaryStructure,
  AttendanceDailySummary
} = Models;

export const calculateEmployeePayroll = async (businessId, period) => {
  console.log(`[PayrollEngine] Calculating payroll for businessId: ${businessId}, period: ${period}`);

  if (!Employee) {
    console.error('[PayrollEngine] ERROR: Employee model is undefined at runtime');
    throw new Error('Employee model is not correctly initialized');
  }

  const employees = await Employee.findAll({ where: { businessId } });
  console.log(`[PayrollEngine] Found ${employees.length} employees to process.`);

  const results = [];

  // ✅ Convert "YYYY-MM" -> month date range [start, end)
  const startStr = `${period}-01`;
  const start = new Date(`${period}-01T00:00:00.000Z`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const endStr = end.toISOString().slice(0, 10);

  // load payroll settings once per run (contains `proration` flag)
  let payrollSetup = null;
  try {
    payrollSetup = await Models.PayrollSetting.findOne({ where: { businessId } });
  } catch (e) {
    console.warn('[PayrollEngine] Could not load PayrollSetting', e && e.message);
  }

  const prorationEnabled = !!(payrollSetup && payrollSetup.proration);

  for (const emp of employees) {
    const assignment = await EmployeeSalaryAssignment.findOne({
      where: {
        businessId,
        employeeId: emp.id,
      },
      include: [{ model: SalaryStructure, as: 'salaryStructure' }],
    });

    if (!assignment) {
      console.log(`[PayrollEngine] No salary assignment for employee ${emp.empId} (${emp.id})`);
      continue;
    }

    if (!assignment.salaryStructure) {
      console.warn(`[PayrollEngine] Salary structure missing for assignment ${assignment.id}`);
      continue;
    }

    const structure = assignment.salaryStructure;
    const earnings = {};
    const deductions = {};
    let gross = 0;
    let totalDeductions = 0;

    // helper: normalize variable names for formula evaluation
    const normalizeVar = (s) => (s || '').toString().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '').toUpperCase();

    // Normalise components: support legacy shape where components may be an object
    // { earnings: [...], deductions: [...] } or the newer flat array format
    let comps = [];
    try {
      if (Array.isArray(structure.components)) {
        comps = structure.components;
      } else if (structure.components && typeof structure.components === 'object') {
        // Convert earnings/deductions arrays into unified component entries
        const earn = Array.isArray(structure.components.earnings) ? structure.components.earnings : [];
        const ded = Array.isArray(structure.components.deductions) ? structure.components.deductions : [];
        comps = [
          ...earn.map(c => ({ ...c, type: (c.type || 'EARNING') })),
          ...ded.map(c => ({ ...c, type: (c.type || 'DEDUCTION') })),
        ];
      } else {
        comps = [];
      }
    } catch (e) {
      console.warn('[PayrollEngine] Failed to normalise structure.components for structure', structure.id, e && e.message);
      comps = [];
    }

    // evaluate component definitions - supports fixed value or formulas
    for (const comp of (comps || [])) {
      const displayKey = comp.name || comp.componentId || comp.code || 'COMP';
      const key = displayKey;
      const code = comp.code || displayKey;
      const type = (comp.type || '').toString().toUpperCase();

      // build a context of already-calculated values for formula evaluation
      const ctx = {};
      Object.keys(earnings).forEach(k => { ctx[normalizeVar(k)] = Number(earnings[k] || 0); });
      Object.keys(deductions).forEach(k => { ctx[normalizeVar(k)] = Number(deductions[k] || 0); });
      ctx.GROSS = Number(gross || 0);
      ctx.CTC = Number(emp.empCtc || 0);

      let value = 0;
      // If a formula exists, try to evaluate it. Accept simple expressions and "X% of Y" style.
      if (comp.formula && comp.formula.toString().trim()) {
        try {
          let expr = comp.formula.toString();
          // normalize percent-of language: '12% of BASIC' -> '(12/100)*BASIC'
          expr = expr.replace(/(\d+(?:\.\d+)?)\s*%\s*(?:of\s+)?/gi, '($1/100)*');
          // replace word 'of' with '*'
          expr = expr.replace(/\bof\b/gi, '*');

          // replace variable tokens with numeric literals from ctx
          expr = expr.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (tok) => {
            const n = normalizeVar(tok);
            if (Object.prototype.hasOwnProperty.call(ctx, n)) return `(${Number(ctx[n]||0)})`;
            // if token is a number, keep it
            if (/^\d+(?:\.\d+)?$/.test(tok)) return tok;
            return '0';
          });

          // safety: allow only digits and operators after substitution
          if (/[^0-9+\-*/().\s]/.test(expr)) throw new Error('Invalid characters in formula');
          // Evaluate expression
          // eslint-disable-next-line no-new-func
          const res = Function(`"use strict";return (${expr});`)();
          value = Number(Math.round((Number(res) || 0) * 100) / 100);
        } catch (e) {
          console.warn('[PayrollEngine] Formula eval failed for', code, comp.formula, e && e.message);
          value = 0;
        }
      } else {
        value = Number(comp.value) || 0;
      }

      if (type === 'DEDUCTION') {
        deductions[key] = value;
        totalDeductions += Number(value);
      } else {
        // treat as earning by default
        earnings[key] = value;
        gross += Number(value);
      }
    }

    const lopDays = await AttendanceDailySummary.count({
      where: {
        businessId,
        employeeId: emp.id,
        status: 'ABSENT',
        date: { [Op.gte]: startStr, [Op.lt]: endStr },
      },
    });

    // If proration is enabled, compute active days in the period for this employee
    if (prorationEnabled) {
      try {
        const msPerDay = 24 * 60 * 60 * 1000;
        // convert start/end (UTC) to local Date objects representing the period
        const periodStart = new Date(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
        const periodEnd = new Date(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()); // first day of next month
        const periodLastDay = new Date(periodEnd.getTime() - msPerDay);

        const joinDate = emp.empDateOfJoining ? new Date(emp.empDateOfJoining) : null;
        const lastWorking = emp.lastWorkingDay ? new Date(emp.lastWorkingDay) : null;

        const activeFrom = joinDate && joinDate > periodStart ? joinDate : periodStart;
        const activeTo = lastWorking && lastWorking < periodLastDay ? lastWorking : periodLastDay;

        const activeDays = activeTo >= activeFrom ? Math.floor((activeTo - activeFrom) / msPerDay) + 1 : 0;
        const totalDays = Math.floor((periodLastDay - periodStart) / msPerDay) + 1;

        if (activeDays <= 0) {
          // employee not active during period — skip
          console.log(`[PayrollEngine] Skipping employee ${emp.empId} (${emp.id}) — not active in period`);
          continue;
        }

        if (activeDays < totalDays) {
          const factor = activeDays / totalDays;
          // prorate earnings and recompute gross
          let proratedGross = 0;
          for (const k of Object.keys(earnings)) {
            const orig = Number(earnings[k] || 0);
            const pr = Math.round((orig * factor) * 100) / 100; // round to 2 decimals
            earnings[k] = pr;
            proratedGross += pr;
          }
          gross = proratedGross;
          // note: statutory deductions will be calculated from prorated gross below
        }
      } catch (e) {
        console.warn('[PayrollEngine] Proration calculation failed for employee', emp.id, e && e.message);
      }
    }

    const statutory = await calculateStatutoryDeductions({
      businessId,
      grossPay: gross,
      earnings,
    });

    for (const [name, value] of Object.entries(statutory)) {
      deductions[name] = value;
      totalDeductions += Number(value);
    }

    const netPay = gross - totalDeductions;

    results.push({
      employeeId: emp.id,
      earnings,
      deductions,
      grossPay: gross,
      totalDeductions,
      netPay,
      lopDays,
    });
  }

  return results;
};
