/**
 * Seed Enterprise Contract Employee Templates
 * Creates compliant, finance-safe templates for contract workers
 */

import SalaryTemplate from '../../src/models/SalaryTemplate.js';
import TemplateComponent from '../../src/models/TemplateComponent.js';
import { sequelize } from '../../src/db/index.js';

const enterpriseTemplates = [
  {
    name: 'On-Payroll Contract Worker',
    description: 'Compliant salary structure for contract workers on company payroll with all statutory benefits. Includes HRA, PF, ESI, Professional Tax, and Gratuity.',
    hraMetroPercent: 50.00,
    hraNonMetroPercent: 40.00,
    includeEmployerInCTC: false,
    pfCapAmount: 1800.00,
    pfCapThreshold: 15000.00,
    esiThreshold: 21000.00,
    gratuityRate: 0.0481,
    includeGratuityInCTC: false,
    metroCities: ['Mumbai', 'Delhi', 'Kolkata', 'Chennai', 'Bangalore', 'Hyderabad', 'Pune'],
    autoBalanceSpecialAllowance: true,
    components: [
      // Earnings
      {
        componentName: 'Basic Salary',
        componentCode: 'BASIC',
        componentType: 'earning',
        calculationType: 'percent_of_ctc',
        value: 40,
        isTaxable: true,
        affectsPf: true,
        displayOrder: 1,
        dependsOn: [],
      },
      {
        componentName: 'House Rent Allowance',
        componentCode: 'HRA',
        componentType: 'earning',
        calculationType: 'percent_of_basic',
        value: 40, // Default, will be overridden by location
        isTaxable: true,
        displayOrder: 2,
        dependsOn: ['BASIC'],
      },
      {
        componentName: 'Special Allowance',
        componentCode: 'SPECIAL_ALLOWANCE',
        componentType: 'earning',
        calculationType: 'formula',
        formulaExpression: 'RemainingCTC()',
        isTaxable: true,
        displayOrder: 3,
        dependsOn: ['BASIC', 'HRA'],
      },
      
      // Deductions
      {
        componentName: 'PF Employee',
        componentCode: 'PF_EMP',
        componentType: 'deduction',
        calculationType: 'formula',
        formulaExpression: 'MIN(0.12*BASIC, PF_CAP)',
        isStatutory: true,
        isLocked: true,
        displayOrder: 10,
        dependsOn: ['BASIC'],
      },
      {
        componentName: 'ESI Employee',
        componentCode: 'ESI_EMP',
        componentType: 'deduction',
        calculationType: 'formula',
        formulaExpression: 'IF(GROSS <= ESI_THRESHOLD, 0.0075*GROSS, 0)',
        isStatutory: true,
        isLocked: true,
        displayOrder: 11,
        dependsOn: ['GROSS'],
      },
      {
        componentName: 'Professional Tax',
        componentCode: 'PROFESSIONAL_TAX',
        componentType: 'deduction',
        calculationType: 'formula',
        formulaExpression: '0', // Will be calculated by StateTaxService
        isStatutory: true,
        isLocked: true,
        displayOrder: 12,
        dependsOn: ['GROSS'],
      },
      
      // Employer Contributions
      {
        componentName: 'PF Employer',
        componentCode: 'PF_ER',
        componentType: 'employer_contribution',
        calculationType: 'formula',
        formulaExpression: 'MIN(0.12*BASIC, PF_CAP)',
        displayOrder: 20,
        dependsOn: ['BASIC'],
      },
      {
        componentName: 'ESI Employer',
        componentCode: 'ESI_ER',
        componentType: 'employer_contribution',
        calculationType: 'formula',
        formulaExpression: 'IF(GROSS <= ESI_THRESHOLD, 0.0325*GROSS, 0)',
        displayOrder: 21,
        dependsOn: ['GROSS'],
      },
      {
        componentName: 'Gratuity',
        componentCode: 'GRATUITY',
        componentType: 'employer_contribution',
        calculationType: 'formula',
        formulaExpression: '0.0481*BASIC',
        displayOrder: 22,
        dependsOn: ['BASIC'],
      },
    ],
  },
  {
    name: 'Vendor / Third-Party Contract',
    description: 'Minimal structure for vendor/third-party contract workers. No statutory benefits (PF, ESI) as they are on vendor payroll.',
    hraMetroPercent: 50.00,
    hraNonMetroPercent: 40.00,
    includeEmployerInCTC: true,
    pfCapAmount: 1800.00,
    pfCapThreshold: 15000.00,
    esiThreshold: 21000.00,
    gratuityRate: 0.0481,
    includeGratuityInCTC: false,
    metroCities: ['Mumbai', 'Delhi', 'Kolkata', 'Chennai', 'Bangalore', 'Hyderabad', 'Pune'],
    autoBalanceSpecialAllowance: true,
    components: [
      // Earnings only - no statutory components
      {
        componentName: 'Fixed Pay',
        componentCode: 'FIXED_PAY',
        componentType: 'earning',
        calculationType: 'percent_of_ctc',
        value: 100,
        isTaxable: true,
        affectsPf: false,
        displayOrder: 1,
        dependsOn: [],
      },
    ],
  },
];

async function seedEnterpriseTemplates() {
  try {
    console.log('Seeding enterprise contract templates...');

    for (const templateData of enterpriseTemplates) {
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
      });

      // Create components
      for (const comp of components) {
        await TemplateComponent.create({
          templateId: template.id,
          ...comp,
        });
      }

      console.log(`Created template: ${templateInfo.name}`);
    }

    console.log('Enterprise contract templates seeded successfully!');
  } catch (error) {
    console.error('Error seeding templates:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  sequelize.sync().then(() => {
    seedEnterpriseTemplates().then(() => {
      console.log('Seeding complete');
      process.exit(0);
    }).catch(err => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
  });
}

export default seedEnterpriseTemplates;
