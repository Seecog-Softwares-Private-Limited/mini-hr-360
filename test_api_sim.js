import Sequelize from 'sequelize';

const db = new Sequelize('mini_hr_360', 'root', 'Nikhil-700', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
  logging: false
});

const calculateStructureTotals = (components) => {
  if (!Array.isArray(components) || components.length === 0) {
    return { monthlyCTC: 0, annualCTC: 0, totalEarnings: 0, totalDeductions: 0 };
  }
  
  const isDeductionByName = (name) => {
    return /pf|provident|tds|tax|esi|loan|deduct|advance|professional|insurance/i.test(name || '');
  };
  
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
  
  const basicBasedEarnings = (basicAmount * pctBasicEarnings) / 100;
  const basicBasedDeductions = (basicAmount * pctBasicDeductions) / 100;
  const baseEarnings = fixedEarnings + basicBasedEarnings;
  
  let monthlyCTC = 0;
  const denom = 1 - (pctCtcEarnings / 100);
  if (Math.abs(denom) < 0.001) {
    monthlyCTC = baseEarnings;
  } else {
    monthlyCTC = baseEarnings / denom;
  }
  
  const ctcBasedDeductions = (monthlyCTC * pctCtcDeductions) / 100;
  const totalDeductions = fixedDeductions + basicBasedDeductions + ctcBasedDeductions;
  
  return {
    monthlyCTC: Math.round(monthlyCTC * 100) / 100,
    annualCTC: Math.round(monthlyCTC * 12 * 100) / 100,
    totalEarnings: Math.round(monthlyCTC * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100
  };
};

// Simulate getStructureById service function
async function getStructureById(businessId, id) {
  const [rows] = await db.query(`SELECT * FROM salary_structures WHERE id = ? AND businessId = ?`, { replacements: [id, businessId] });
  const structure = rows[0];
  if (!structure) return null;
  
  // Get assignedCount
  const [countResult] = await db.query(`SELECT COUNT(*) as count FROM employee_salary_assignments WHERE salaryStructureId = ? AND businessId = ?`, { replacements: [id, businessId] });
  const assignedCount = countResult[0]?.count || 0;
  
  // Parse components
  let components = structure.components;
  if (typeof components === 'string') {
    try { components = JSON.parse(components); } catch (e) { components = []; }
  }
  
  // Compute totals
  const totals = calculateStructureTotals(components || []);
  
  return {
    ...structure,
    components,
    assignedCount,
    ...totals
  };
}

(async () => {
  try {
    console.log('=== Simulating API call for structure ID 5, businessId 26 ===\n');
    const result = await getStructureById(26, 5);
    
    console.log('Result that would be returned by API:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n=== Key values for frontend: ===');
    console.log('monthlyCTC:', result.monthlyCTC);
    console.log('annualCTC:', result.annualCTC);
    console.log('assignedCount:', result.assignedCount);
    console.log('totalDeductions:', result.totalDeductions);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await db.close();
  }
})();
