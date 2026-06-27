/**
 * Indian payroll-style annual CTC → monthly breakup.
 */
export function generateSalaryBreakup(annualGrossCtc, options = {}) {
  const {
    variablePayPct = 0,
    basicPctOfFixedGross = 0.40,
    hraPctOfBasic = 0.40,
    monthlyProfessionalTax = 200,
    professionalTaxThresholdMonthly = 25000,
    pfPctOfBasic = 0,
    esiPctOfGross = 0,
    esiWageThresholdMonthly = 21000,
    standardDeductionAnnual = 50000,
  } = options;

  const round = (val) => Math.round(val);
  const toMonthly = (val) => val / 12;

  if (!annualGrossCtc || annualGrossCtc <= 0) {
    return {
      meta: { currency: 'INR', annualGrossCtc: 0, variablePayPct: 0 },
      annual: {
        fixedGross: 0,
        variablePay: 0,
        basic: 0,
        hra: 0,
        specialAllowance: 0,
        totalCtc: 0,
      },
      monthly: {
        fixedGross: 0,
        variablePayTarget: 0,
        basic: 0,
        hra: 0,
        specialAllowance: 0,
      },
      deductionsMonthly: {
        professionalTax: 0,
        pfEmployee: 0,
        esiEmployee: 0,
        incomeTaxTds: 0,
        totalDeductions: 0,
      },
      netTakeHome: { withoutVariable: 0, withVariableAveraged: 0 },
    };
  }

  const monthlyCtc = toMonthly(annualGrossCtc);
  const variablePayAnnual = annualGrossCtc * variablePayPct;
  const fixedGrossAnnual = annualGrossCtc - variablePayAnnual;
  const basicAnnual = fixedGrossAnnual * basicPctOfFixedGross;
  const hraAnnual = basicAnnual * hraPctOfBasic;
  const specialAllowanceAnnual = fixedGrossAnnual - basicAnnual - hraAnnual;
  const basicMonthly = toMonthly(basicAnnual);
  const hraMonthly = toMonthly(hraAnnual);
  const specialAllowanceMonthly = toMonthly(specialAllowanceAnnual);
  const fixedGrossMonthly = toMonthly(fixedGrossAnnual);
  const variablePayMonthlyTarget = toMonthly(variablePayAnnual);

  const professionalTaxMonthly =
    monthlyCtc >= professionalTaxThresholdMonthly ? monthlyProfessionalTax : 0;
  const pfMonthly = basicMonthly * pfPctOfBasic;
  const esiMonthly =
    fixedGrossMonthly <= esiWageThresholdMonthly ? fixedGrossMonthly * esiPctOfGross : 0;

  const taxableIncomeAnnual = Math.max(0, annualGrossCtc - standardDeductionAnnual);
  let taxAnnual = 0;
  if (taxableIncomeAnnual <= 250000) taxAnnual = 0;
  else if (taxableIncomeAnnual <= 500000) taxAnnual = (taxableIncomeAnnual - 250000) * 0.05;
  else if (taxableIncomeAnnual <= 1000000) {
    taxAnnual = 250000 * 0.05 + (taxableIncomeAnnual - 500000) * 0.2;
  } else {
    taxAnnual = 250000 * 0.05 + 500000 * 0.2 + (taxableIncomeAnnual - 1000000) * 0.3;
  }
  const incomeTaxMonthly = taxAnnual / 12;
  const totalDeductionsMonthly =
    professionalTaxMonthly + pfMonthly + esiMonthly + incomeTaxMonthly;

  return {
    meta: {
      currency: 'INR',
      annualGrossCtc: round(annualGrossCtc),
      variablePayPct: variablePayPct * 100,
    },
    annual: {
      fixedGross: round(fixedGrossAnnual),
      variablePay: round(variablePayAnnual),
      basic: round(basicAnnual),
      hra: round(hraAnnual),
      specialAllowance: round(specialAllowanceAnnual),
      totalCtc: round(annualGrossCtc),
    },
    monthly: {
      fixedGross: round(fixedGrossMonthly),
      variablePayTarget: round(variablePayMonthlyTarget),
      basic: round(basicMonthly),
      hra: round(hraMonthly),
      specialAllowance: round(specialAllowanceMonthly),
    },
    deductionsMonthly: {
      professionalTax: round(professionalTaxMonthly),
      pfEmployee: round(pfMonthly),
      esiEmployee: round(esiMonthly),
      incomeTaxTds: round(incomeTaxMonthly),
      totalDeductions: round(totalDeductionsMonthly),
    },
    netTakeHome: {
      withoutVariable: round(fixedGrossMonthly - totalDeductionsMonthly),
      withVariableAveraged: round(
        fixedGrossMonthly + variablePayMonthlyTarget - totalDeductionsMonthly
      ),
    },
  };
}
