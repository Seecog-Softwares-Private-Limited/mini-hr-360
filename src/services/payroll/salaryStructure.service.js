import SalaryStructure from '../../models/SalaryStructure.js';
import EmployeeSalaryAssignment from '../../models/payroll.EmployeeSalaryAssignment.js';
import Employee from '../../models/Employee.js';

/**
 * Calculate CTC and deductions based on component formulas
 * Supports: fixed amounts, % of Basic, % of CTC
 * Also handles legacy data without calcType field
 */
const calculateStructureTotals = (components) => {
  if (!Array.isArray(components) || components.length === 0) {
    return { monthlyCTC: 0, annualCTC: 0, totalEarnings: 0, totalDeductions: 0 };
  }
  
  // Detect if component is a deduction based on name pattern
  const isDeductionByName = (name) => {
    return /pf|provident|tds|tax|esi|loan|deduct|advance|professional|insurance|state/i.test(name || '');
  };
  
  // First pass: identify basic salary and categorize components
  let basicAmount = 0;
  let fixedEarnings = 0;
  let pctBasicEarnings = 0;
  let pctCtcEarnings = 0;
  let fixedDeductions = 0;
  let pctBasicDeductions = 0;
  let pctCtcDeductions = 0;
  
  components.forEach(c => {
    const val = Number(c.value || 0);
    const typeField = String(c.type || '').toUpperCase();
    const calcType = String(c.calcType || 'fixed').toLowerCase();
    const compName = String(c.componentId || c.name || '').toLowerCase();
    
    // Determine if it's a deduction - check type field first, then fallback to name pattern
    const isDeduction = typeField === 'DEDUCTION' || (typeField !== 'EARNING' && isDeductionByName(compName));
    const isBasic = compName.includes('basic');
    
    if (calcType === 'fixed' || calcType === '' || !calcType) {
      if (isBasic && !isDeduction) basicAmount = val;
      if (isDeduction) fixedDeductions += val;
      else fixedEarnings += val;
    } else if (calcType === 'pct_basic') {
      if (isDeduction) pctBasicDeductions += val;
      else pctBasicEarnings += val;
    } else if (calcType === 'pct_ctc') {
      if (isDeduction) pctCtcDeductions += val;
      else pctCtcEarnings += val;
    }
  });
  
  // Calculate % of basic contributions
  const basicBasedEarnings = (basicAmount * pctBasicEarnings) / 100;
  const basicBasedDeductions = (basicAmount * pctBasicDeductions) / 100;
  
  // Base earnings (fixed + % of basic)
  const baseEarnings = fixedEarnings + basicBasedEarnings;
  
  // Solve for CTC: CTC = baseEarnings / (1 - pctCtcEarnings/100)
  let monthlyCTC = 0;
  const denom = 1 - (pctCtcEarnings / 100);
  if (Math.abs(denom) < 0.001) {
    monthlyCTC = baseEarnings;
  } else {
    monthlyCTC = baseEarnings / denom;
  }
  
  // Calculate deductions
  const ctcBasedDeductions = (monthlyCTC * pctCtcDeductions) / 100;
  const totalDeductions = fixedDeductions + basicBasedDeductions + ctcBasedDeductions;
  
  return {
    monthlyCTC: Math.round(monthlyCTC * 100) / 100,
    annualCTC: Math.round(monthlyCTC * 12 * 100) / 100,
    totalEarnings: Math.round(monthlyCTC * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100
  };
};

export const listStructures = async (businessId) => {
  const structures = await SalaryStructure.findAll({ where: { businessId } });
  
  // Enrich with assignedCount and computed totals
  const enriched = await Promise.all(structures.map(async (s) => {
    const assignedCount = await EmployeeSalaryAssignment.count({ 
      where: { salaryStructureId: s.id, businessId } 
    });
    
    // Compute totals from components using formula logic
    const totals = calculateStructureTotals(s.components || []);
    
    return {
      ...s.toJSON(),
      assignedCount,
      ...totals
    };
  }));
  
  return enriched;
};

export const createStructure = async (businessId, data) => {
  try {
    // sanitize payload: only allow attributes defined on the model
    const attrs = Object.keys(SalaryStructure.rawAttributes || {});
    const sanitized = {};
    for (const k of attrs) {
      if (k === 'id' || k === 'createdAt' || k === 'updatedAt') continue;
      if (k === 'businessId') continue; // set explicitly below
      if (Object.prototype.hasOwnProperty.call(data, k)) sanitized[k] = data[k];
    }

    // Ensure components is a JSON array
    if (!sanitized.components) sanitized.components = Array.isArray(data.components) ? data.components : [];

    const payload = { ...sanitized, businessId };
    return await SalaryStructure.create(payload);
  } catch (err) {
    console.error('salaryStructure.service.createStructure: DB error while creating SalaryStructure:', err && err.message ? err.message : err);
    if (err && err.original) console.error('Original error:', err.original);
    if (err && err.sql) console.error('SQL:', err.sql);
    throw err;
  }
};

export const getStructureById = async (businessId, id) => {
  const structure = await SalaryStructure.findOne({ where: { id, businessId } });
  if (!structure) return null;
  
  // Get assigned employee count
  const assignedCount = await EmployeeSalaryAssignment.count({ 
    where: { salaryStructureId: id, businessId } 
  });
  
  // Compute totals from components using formula logic
  const totals = calculateStructureTotals(structure.components || []);
  
  return {
    ...structure.toJSON(),
    assignedCount,
    ...totals
  };
};

export const updateStructure = async (businessId, id, data) => {
  const allowed = Object.keys(SalaryStructure.rawAttributes || {});
  const payload = {};
  for (const k of allowed) {
    if (k === 'id' || k === 'businessId' || k === 'createdAt' || k === 'updatedAt') continue;
    if (Object.prototype.hasOwnProperty.call(data, k)) payload[k] = data[k];
  }
  await SalaryStructure.update(payload, { where: { id, businessId } });
  return getStructureById(businessId, id);
};

export const deleteStructure = async (businessId, id) => {
  // Prevent deletion if assigned to employees
  const assignedCount = await EmployeeSalaryAssignment.count({ where: { salaryStructureId: id, businessId } });
  if (assignedCount > 0) {
    throw new Error('Cannot delete structure: it is assigned to employees');
  }

  const deleted = await SalaryStructure.destroy({ where: { id, businessId } });
  return { deleted: !!deleted };
};

export const assignToEmployee = async (businessId, payload) => {
  // payload can be { employeeId, salaryStructureId, effectiveFrom }
  // or { employeeIds: [...], salaryStructureId, effectiveFrom }
  const { employeeId, employeeIds, salaryStructureId, effectiveFrom } = payload || {};
  const toAssign = Array.isArray(employeeIds) ? employeeIds.slice() : (employeeId ? [employeeId] : []);
  if (!salaryStructureId || !toAssign.length) throw new Error('Invalid assign payload');

  const created = [];
  for (const eId of toAssign) {
    const rec = await EmployeeSalaryAssignment.create({ businessId, employeeId: eId, salaryStructureId, effectiveFrom });
    created.push(rec);
  }
  return { createdCount: created.length };
};

export const listAssignments = async (businessId, salaryStructureId) => {
  const assigns = await EmployeeSalaryAssignment.findAll({ where: { businessId, salaryStructureId } });
  const employeeIds = assigns.map(a => a.employeeId).filter(Boolean);
  const employees = employeeIds.length ? await Employee.findAll({ where: { id: employeeIds }, attributes: ['id', 'empName', 'empId', 'empDepartment'] }) : [];
  const byId = employees.reduce((acc, e) => { acc[e.id] = e; return acc; }, {});
  return assigns.map(a => ({ id: a.id, employeeId: a.employeeId, effectiveFrom: a.effectiveFrom, effectiveTo: a.effectiveTo, employee: byId[a.employeeId] || null }));
};

export const unassignEmployees = async (businessId, salaryStructureId, employeeIds) => {
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) throw new Error('No employees specified');
  const deleted = await EmployeeSalaryAssignment.destroy({ where: { businessId, salaryStructureId, employeeId: employeeIds } });
  return { deletedCount: deleted };
};
