/**
 * Salary Template Controller
 * Enterprise-grade template management API
 */

// Import models index to ensure associations are set up
import '../../models/index.js';

import SalaryTemplate from '../../models/SalaryTemplate.js';
import TemplateComponent from '../../models/TemplateComponent.js';
import RuleEngine from '../../services/payroll/RuleEngine.js';
import ComplianceService from '../../services/payroll/ComplianceService.js';
import StateTaxService from '../../services/payroll/StateTaxService.js';

/**
 * Get all templates
 */
export const getAllTemplates = async (req, res) => {
  try {
    const templates = await SalaryTemplate.findAll({
      where: { isActive: true },
      include: [
        {
          model: TemplateComponent,
          as: 'components',
          order: [['displayOrder', 'ASC']],
        },
      ],
      order: [['name', 'ASC'], ['version', 'DESC']],
    });

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get template by ID
 */
export const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await SalaryTemplate.findByPk(id, {
      include: [
        {
          model: TemplateComponent,
          as: 'components',
          order: [['displayOrder', 'ASC']],
        },
      ],
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Create new template
 */
export const createTemplate = async (req, res) => {
  try {
    const { name, description, components, ...templateData } = req.body;

    // Check for existing template with same name
    const existing = await SalaryTemplate.findOne({
      where: { name, isActive: true },
      order: [['version', 'DESC']],
    });

    const version = existing ? existing.version + 1 : 1;

    // Create template
    const template = await SalaryTemplate.create({
      name,
      description,
      version,
      createdBy: req.user?.id,
      effectiveFrom: templateData.effectiveFrom || new Date(),
      ...templateData,
    });

    // Create components
    if (components && Array.isArray(components)) {
      for (const comp of components) {
        await TemplateComponent.create({
          templateId: template.id,
          ...comp,
        });
      }
    }

    // Validate template
    const validation = await validateTemplate(template.id);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Template validation failed',
        warnings: validation.warnings,
      });
    }

    const createdTemplate = await SalaryTemplate.findByPk(template.id, {
      include: [
        {
          model: TemplateComponent,
          as: 'components',
          order: [['displayOrder', 'ASC']],
        },
      ],
    });

    res.status(201).json({
      success: true,
      data: createdTemplate,
      warnings: validation.warnings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Calculate salary from template
 */
export const calculateSalary = async (req, res) => {
  try {
    const { templateId, ctc, employeeState } = req.body;

    const template = await SalaryTemplate.findByPk(templateId, {
      include: [
        {
          model: TemplateComponent,
          as: 'components',
          order: [['displayOrder', 'ASC']],
        },
      ],
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    // Get configuration from template
    const config = {
      enablePF: true,
      enableESI: true,
      enableProfessionalTax: true,
      enableGratuity: true,
      pfCapAmount: template.pfCapAmount || 1800,
      pfCapThreshold: template.pfCapThreshold || 15000,
      esiThreshold: template.esiThreshold || 21000,
      gratuityRate: template.gratuityRate || 0.0481,
      includeEmployerInCTC: template.includeEmployerInCTC || false,
      includeGratuityInCTC: template.includeGratuityInCTC || false,
      showEmployerCost: true,
    };

    // Determine employee location (metro/non-metro)
    const employeeLocation = determineEmployeeLocation(employeeState, template.metroCities || []);
    
    // Get HRA percentage based on location
    const hraPercent = employeeLocation === 'metro' 
      ? (template.hraMetroPercent || 50) 
      : (template.hraNonMetroPercent || 40);

    // Calculate salary
    const calculatedSalary = await RuleEngine.calculateSalary(
      template.components,
      ctc,
      {
        autoBalanceSpecialAllowance: template.autoBalanceSpecialAllowance,
        includeEmployerInCTC: template.includeEmployerInCTC,
        employeeLocation: employeeLocation,
        hraPercent: hraPercent,
        pfCap: pfCap,
        esiThreshold: esiThreshold,
      }
    );

    // Apply professional tax if needed (state-based lookup)
    if (config.enableProfessionalTax && employeeState) {
      const professionalTax = await StateTaxService.getProfessionalTax(
        employeeState,
        calculatedSalary.earnings
      );
      if (professionalTax > 0) {
        calculatedSalary.components.PROFESSIONAL_TAX = professionalTax;
        calculatedSalary.deductions += professionalTax;
        calculatedSalary.net -= professionalTax;
      }
    }
    
    // Update PF and ESI formulas with actual cap/threshold values
    const pfCap = template.pfCapAmount || 1800;
    const esiThreshold = template.esiThreshold || 21000;
    
    // Recalculate if needed with proper context
    const recalculated = await RuleEngine.calculateSalary(
      template.components,
      ctc,
      {
        autoBalanceSpecialAllowance: template.autoBalanceSpecialAllowance,
        includeEmployerInCTC: template.includeEmployerInCTC,
        employeeLocation: employeeLocation,
        pfCap: pfCap,
        esiThreshold: esiThreshold,
      }
    );
    
    // Merge professional tax into recalculated result
    if (calculatedSalary.components.PROFESSIONAL_TAX) {
      recalculated.components.PROFESSIONAL_TAX = calculatedSalary.components.PROFESSIONAL_TAX;
      recalculated.deductions += calculatedSalary.components.PROFESSIONAL_TAX;
      recalculated.net -= calculatedSalary.components.PROFESSIONAL_TAX;
    }
    
    const finalSalary = recalculated;

    // Compliance check
    const compliance = await ComplianceService.validateSalaryStructure(
      finalSalary,
      template.components,
      ctc,
      config
    );

    res.json({
      success: true,
      data: {
        ...finalSalary,
        compliance,
        employeeLocation: employeeLocation,
        trueCostToCompany: finalSalary.totalEmployerCost,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Validate template
 */
const validateTemplate = async (templateId) => {
  const template = await SalaryTemplate.findByPk(templateId, {
    include: [
      {
        model: TemplateComponent,
        as: 'components',
      },
    ],
  });

  if (!template || !template.components || template.components.length === 0) {
    return {
      isValid: false,
      warnings: [{ type: 'template_empty', severity: 'error', message: 'Template has no components' }],
    };
  }

  // Check for circular dependencies
  const { graph } = RuleEngine.buildDependencyGraph(template.components);
  const cycleCheck = RuleEngine.detectCircularDependencies(graph);

  if (cycleCheck.hasCycle) {
    return {
      isValid: false,
      warnings: [
        {
          type: 'circular_dependency',
          severity: 'error',
          message: `Circular dependency detected: ${cycleCheck.cycles[0].join(' -> ')}`,
        },
      ],
    };
  }

  // Validate formulas
  const warnings = [];
  for (const comp of template.components) {
    if (comp.calculationType === 'formula' && comp.formulaExpression) {
      const validation = RuleEngine.validateFormula(comp.formulaExpression);
      if (!validation.valid) {
        warnings.push({
          type: 'formula_error',
          severity: 'error',
          message: `Invalid formula in ${comp.componentCode}: ${validation.error}`,
          componentCode: comp.componentCode,
        });
      }
    }
  }

  return {
    isValid: warnings.filter(w => w.severity === 'error').length === 0,
    warnings,
  };
};

/**
 * Determine if employee location is metro or non-metro
 */
const determineEmployeeLocation = (state, metroCities = []) => {
  if (!state) return 'non-metro';
  
  const defaultMetros = ['Mumbai', 'Delhi', 'Kolkata', 'Chennai', 'Bangalore', 'Hyderabad', 'Pune'];
  const metros = metroCities.length > 0 ? metroCities : defaultMetros;
  
  // Check if state contains any metro city name
  const stateUpper = state.toUpperCase();
  const isMetro = metros.some(city => stateUpper.includes(city.toUpperCase()));
  
  return isMetro ? 'metro' : 'non-metro';
};
