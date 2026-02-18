/**
 * Compliance Service
 * Validates salary structures against statutory requirements
 * Generates warnings and compliance checks
 */

class ComplianceService {
  /**
   * Check basic salary percentage compliance
   */
  checkBasicPercentage(ctc, basic) {
    const basicPercent = (basic / (ctc / 12)) * 100;
    const warnings = [];

    if (basicPercent < 40) {
      warnings.push({
        type: 'basic_percentage',
        severity: 'warning',
        message: `Basic salary is ${basicPercent.toFixed(2)}% of CTC. Recommended minimum is 40% for compliance.`,
        componentCode: 'BASIC',
      });
    }

    if (basicPercent > 60) {
      warnings.push({
        type: 'basic_percentage',
        severity: 'info',
        message: `Basic salary is ${basicPercent.toFixed(2)}% of CTC. Consider redistributing to allowances for tax optimization.`,
        componentCode: 'BASIC',
      });
    }

    return warnings;
  }

  /**
   * Validate PF configuration
   */
  validatePF(basic, pfEmployee, pfEmployer, config) {
    const warnings = [];
    const pfCap = config.pfCapAmount || 1800;
    const pfThreshold = config.pfCapThreshold || 15000;
    const expectedEmployeePF = Math.min(basic * 0.12, pfCap);
    const expectedEmployerPF = Math.min(basic * 0.12, pfCap);

    if (config.enablePF) {
      if (Math.abs(pfEmployee - expectedEmployeePF) > 0.01) {
        warnings.push({
          type: 'pf_misconfiguration',
          severity: 'error',
          message: `PF Employee contribution mismatch. Expected: ₹${expectedEmployeePF.toFixed(2)}, Actual: ₹${pfEmployee.toFixed(2)}`,
          componentCode: 'PF_EMP',
        });
      }

      if (pfEmployer && Math.abs(pfEmployer - expectedEmployerPF) > 0.01) {
        warnings.push({
          type: 'pf_misconfiguration',
          severity: 'error',
          message: `PF Employer contribution mismatch. Expected: ₹${expectedEmployerPF.toFixed(2)}, Actual: ₹${pfEmployer.toFixed(2)}`,
          componentCode: 'PF_EMPLOYER',
        });
      }

      // Check if PF cap is applied correctly
      if (basic > pfThreshold) {
        if (pfEmployee > pfCap) {
          warnings.push({
            type: 'pf_misconfiguration',
            severity: 'error',
            message: `PF cap not applied correctly. Basic (₹${basic}) exceeds threshold (₹${pfThreshold}), PF should be capped at ₹${pfCap}`,
            componentCode: 'PF_EMP',
          });
        }
      }

      // Warn if employer PF is missing
      if (!pfEmployer && basic > 0) {
        warnings.push({
          type: 'pf_misconfiguration',
          severity: 'warning',
          message: `Employer PF contribution is missing. This affects True Cost to Company calculation.`,
          componentCode: 'PF_EMPLOYER',
        });
      }
    }

    return warnings;
  }

  /**
   * Validate ESI configuration
   */
  validateESI(gross, esiEmployee, esiEmployer, config) {
    const warnings = [];
    const threshold = config.esiThreshold || 21000;

    if (config.enableESI) {
      if (gross <= threshold) {
        const expectedESIEmployee = gross * 0.0075; // 0.75%
        const expectedESIEmployer = gross * 0.0325; // 3.25%
        
        if (Math.abs(esiEmployee - expectedESIEmployee) > 0.01) {
          warnings.push({
            type: 'esi_threshold',
            severity: 'error',
            message: `ESI Employee contribution mismatch. Expected: ₹${expectedESIEmployee.toFixed(2)}, Actual: ₹${esiEmployee.toFixed(2)}`,
            componentCode: 'ESI_EMP',
          });
        }

        if (esiEmployer && Math.abs(esiEmployer - expectedESIEmployer) > 0.01) {
          warnings.push({
            type: 'esi_threshold',
            severity: 'error',
            message: `ESI Employer contribution mismatch. Expected: ₹${expectedESIEmployer.toFixed(2)}, Actual: ₹${esiEmployer.toFixed(2)}`,
            componentCode: 'ESI_EMPLOYER',
          });
        }
      } else {
        if (esiEmployee > 0) {
          warnings.push({
            type: 'esi_threshold',
            severity: 'warning',
            message: `ESI should not be applicable. Gross (₹${gross}) exceeds threshold (₹${threshold})`,
            componentCode: 'ESI_EMP',
          });
        }
      }

      // Warn if employer ESI is missing when employee ESI exists
      if (esiEmployee > 0 && !esiEmployer) {
        warnings.push({
          type: 'esi_threshold',
          severity: 'warning',
          message: `Employer ESI contribution is missing. This affects True Cost to Company calculation.`,
          componentCode: 'ESI_EMPLOYER',
        });
      }
    }

    return warnings;
  }

  /**
   * Check for missing statutory components
   */
  checkStatutoryComponents(components, config) {
    const warnings = [];
    const requiredStatutory = [];

    if (config.enablePF) {
      requiredStatutory.push('PF_EMP');
      if (config.includeEmployerInCTC || config.showEmployerCost) {
        requiredStatutory.push('PF_EMPLOYER', 'PF_ER');
      }
    }

    if (config.enableESI) {
      requiredStatutory.push('ESI_EMP');
      if (config.includeEmployerInCTC || config.showEmployerCost) {
        requiredStatutory.push('ESI_EMPLOYER', 'ESI_ER');
      }
    }

    if (config.enableProfessionalTax) {
      requiredStatutory.push('PROFESSIONAL_TAX');
    }

    if (config.enableGratuity) {
      requiredStatutory.push('GRATUITY');
    }

    const componentCodes = components.map(c => c.componentCode);
    const missing = requiredStatutory.filter(code => !componentCodes.includes(code));

    if (missing.length > 0) {
      warnings.push({
        type: 'statutory_missing',
        severity: 'warning',
        message: `Missing statutory components: ${missing.join(', ')}`,
        componentCode: null,
      });
    }

    return warnings;
  }

  /**
   * Check for unlocked statutory components
   */
  checkUnlockedStatutory(components) {
    const warnings = [];
    const statutoryComponents = components.filter(c => c.isStatutory && !c.isLocked);

    if (statutoryComponents.length > 0) {
      warnings.push({
        type: 'statutory_unlocked',
        severity: 'warning',
        message: `Statutory components are unlocked and can be edited: ${statutoryComponents.map(c => c.componentCode).join(', ')}. This may cause compliance issues.`,
        componentCode: null,
      });
    }

    return warnings;
  }

  /**
   * Check HRA configuration
   */
  checkHRA(basic, hra, templateConfig) {
    const warnings = [];
    
    if (!hra || hra === 0) {
      warnings.push({
        type: 'hra_missing',
        severity: 'warning',
        message: `HRA component is missing. This blocks employee tax optimization opportunities.`,
        componentCode: 'HRA',
      });
      return warnings;
    }

    // Check if HRA is reasonable (should be 40-50% of basic for tax benefits)
    const hraPercent = (hra / basic) * 100;
    if (hraPercent < 30) {
      warnings.push({
        type: 'hra_low',
        severity: 'info',
        message: `HRA is ${hraPercent.toFixed(2)}% of Basic. Consider increasing to 40-50% for better tax optimization.`,
        componentCode: 'HRA',
      });
    }

    return warnings;
  }

  /**
   * Comprehensive compliance check
   */
  async validateSalaryStructure(calculatedSalary, components, ctc, config) {
    const allWarnings = [];

    // Basic percentage check
    const basic = calculatedSalary.components.BASIC || 0;
    allWarnings.push(...this.checkBasicPercentage(ctc, basic));

    // HRA check
    const hra = calculatedSalary.components.HRA || 0;
    allWarnings.push(...this.checkHRA(basic, hra, config));

    // PF validation
    const pfEmployee = calculatedSalary.components.PF_EMP || calculatedSalary.components.PF_EMPLOYEE || 0;
    const pfEmployer = calculatedSalary.components.PF_EMPLOYER || calculatedSalary.components.PF_ER || 0;
    allWarnings.push(...this.validatePF(basic, pfEmployee, pfEmployer, config));

    // ESI validation
    const gross = calculatedSalary.earnings || 0;
    const esiEmployee = calculatedSalary.components.ESI_EMP || calculatedSalary.components.ESI_EMPLOYEE || 0;
    const esiEmployer = calculatedSalary.components.ESI_EMPLOYER || calculatedSalary.components.ESI_ER || 0;
    allWarnings.push(...this.validateESI(gross, esiEmployee, esiEmployer, config));

    // Statutory components check
    allWarnings.push(...this.checkStatutoryComponents(components, config));

    // Unlocked statutory check
    allWarnings.push(...this.checkUnlockedStatutory(components));

    // CTC balance check
    const monthlyCtc = ctc / 12;
    const totalEarnings = calculatedSalary.earnings || 0;
    const difference = Math.abs(monthlyCtc - totalEarnings);

    if (difference > 1) { // Allow 1 rupee tolerance
      allWarnings.push({
        type: 'ctc_balance',
        severity: 'warning',
        message: `CTC mismatch. Monthly CTC: ₹${monthlyCtc.toFixed(2)}, Total Earnings: ₹${totalEarnings.toFixed(2)}, Difference: ₹${difference.toFixed(2)}`,
        componentCode: null,
      });
    }

    // Gratuity check
    const gratuity = calculatedSalary.components.GRATUITY || 0;
    if (config.enableGratuity && basic > 0 && gratuity === 0) {
      allWarnings.push({
        type: 'gratuity_missing',
        severity: 'info',
        message: `Gratuity component is missing. Consider adding for compliance (4.81% of Basic).`,
        componentCode: 'GRATUITY',
      });
    }

    return {
      isValid: allWarnings.filter(w => w.severity === 'error').length === 0,
      warnings: allWarnings,
    };
  }
}

export default new ComplianceService();
