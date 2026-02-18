/**
 * Seed Default Salary Templates
 * Creates standard templates for common employee types
 */

import SalaryTemplate from '../../src/models/SalaryTemplate.js';
import TemplateComponent from '../../src/models/TemplateComponent.js';
import { sequelize } from '../../src/db/index.js';

const defaultTemplates = [
  {
    name: 'Full-Time Employee',
    description: 'Standard salary structure for full-time employees with all benefits',
    components: [
      // Earnings
      { componentName: 'Basic Salary', componentCode: 'BASIC', componentType: 'earning', calculationType: 'percent_of_ctc', value: 40, isTaxable: true, affectsPf: true, displayOrder: 1 },
      { componentName: 'HRA', componentCode: 'HRA', componentType: 'earning', calculationType: 'percent_of_basic', value: 50, isTaxable: true, displayOrder: 2 },
      { componentName: 'Conveyance Allowance', componentCode: 'CONVEYANCE', componentType: 'earning', calculationType: 'fixed', value: 1600, isTaxable: false, displayOrder: 3 },
      { componentName: 'Medical Allowance', componentCode: 'MEDICAL', componentType: 'earning', calculationType: 'fixed', value: 1250, isTaxable: false, displayOrder: 4 },
      { componentName: 'Special Allowance', componentCode: 'SPECIAL_ALLOWANCE', componentType: 'earning', calculationType: 'formula', formulaExpression: 'CTC/12 - BASIC - HRA - CONVEYANCE - MEDICAL', isTaxable: true, displayOrder: 5 },
      
      // Deductions
      { componentName: 'PF Employee', componentCode: 'PF_EMP', componentType: 'deduction', calculationType: 'formula', formulaExpression: 'MIN(0.12*BASIC, 1800)', isStatutory: true, isLocked: true, displayOrder: 10 },
      { componentName: 'ESI Employee', componentCode: 'ESI_EMP', componentType: 'deduction', calculationType: 'formula', formulaExpression: 'IF(GROSS <= 21000, 0.0075*GROSS, 0)', isStatutory: true, isLocked: true, displayOrder: 11 },
      { componentName: 'Professional Tax', componentCode: 'PROFESSIONAL_TAX', componentType: 'deduction', calculationType: 'formula', formulaExpression: 'IF(GROSS > 15000, 200, IF(GROSS > 11000, 150, 0))', isStatutory: true, isLocked: true, displayOrder: 12 },
      
      // Employer Contributions
      { componentName: 'PF Employer', componentCode: 'PF_EMPLOYER', componentType: 'employer_contribution', calculationType: 'formula', formulaExpression: 'MIN(0.12*BASIC, 1800)', displayOrder: 20 },
      { componentName: 'ESI Employer', componentCode: 'ESI_EMPLOYER', componentType: 'employer_contribution', calculationType: 'formula', formulaExpression: 'IF(GROSS <= 21000, 0.0325*GROSS, 0)', displayOrder: 21 },
      { componentName: 'Gratuity', componentCode: 'GRATUITY', componentType: 'employer_contribution', calculationType: 'formula', formulaExpression: '0.0481*BASIC', displayOrder: 22 },
    ],
  },
  {
    name: 'Contract Worker',
    description: 'Minimal structure for contract workers',
    components: [
      { componentName: 'Basic Salary', componentCode: 'BASIC', componentType: 'earning', calculationType: 'percent_of_ctc', value: 50, isTaxable: true, affectsPf: true, displayOrder: 1 },
      { componentName: 'Special Allowance', componentCode: 'SPECIAL_ALLOWANCE', componentType: 'earning', calculationType: 'formula', formulaExpression: 'CTC/12 - BASIC', isTaxable: true, displayOrder: 2 },
      { componentName: 'PF Employee', componentCode: 'PF_EMP', componentType: 'deduction', calculationType: 'formula', formulaExpression: 'MIN(0.12*BASIC, 1800)', isStatutory: true, isLocked: true, displayOrder: 10 },
      { componentName: 'Professional Tax', componentCode: 'PROFESSIONAL_TAX', componentType: 'deduction', calculationType: 'formula', formulaExpression: 'IF(GROSS > 15000, 200, IF(GROSS > 11000, 150, 0))', isStatutory: true, isLocked: true, displayOrder: 11 },
    ],
  },
];

async function seedTemplates() {
  try {
    console.log('Seeding default salary templates...');

    for (const templateData of defaultTemplates) {
      const { components, ...templateInfo } = templateData;

      // Check if template already exists
      const existing = await SalaryTemplate.findOne({
        where: { name: templateInfo.name, isActive: true },
      });

      if (existing) {
        console.log(`Template "${templateInfo.name}" already exists, skipping...`);
        continue;
      }

      // Create template
      const template = await SalaryTemplate.create({
        ...templateInfo,
        version: 1,
        effectiveFrom: new Date().toISOString().split('T')[0],
        isActive: true,
        autoBalanceSpecialAllowance: true,
      });

      // Create components
      for (const comp of components) {
        await TemplateComponent.create({
          templateId: template.id,
          ...comp,
          dependsOn: extractDependencies(comp.formulaExpression || ''),
        });
      }

      console.log(`Created template: ${templateInfo.name}`);
    }

    console.log('Default templates seeded successfully!');
  } catch (error) {
    console.error('Error seeding templates:', error);
    throw error;
  }
}

function extractDependencies(formula) {
  if (!formula) return [];
  
  const dependencies = [];
  const componentCodes = ['BASIC', 'HRA', 'GROSS', 'CTC', 'CONVEYANCE', 'MEDICAL', 'SPECIAL_ALLOWANCE'];
  
  componentCodes.forEach(code => {
    if (formula.includes(code)) {
      dependencies.push(code);
    }
  });
  
  return dependencies;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  sequelize.sync().then(() => {
    seedTemplates().then(() => {
      console.log('Seeding complete');
      process.exit(0);
    }).catch(err => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
  });
}

export default seedTemplates;
