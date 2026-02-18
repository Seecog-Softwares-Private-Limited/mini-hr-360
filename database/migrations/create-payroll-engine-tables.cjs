/**
 * Enterprise Payroll Engine - Core Tables Migration
 * Creates tables for salary templates, components, rules, and audit trail
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // 1. Salary Templates
    const salaryTemplatesExists = await queryInterface.tableExists('salary_templates');
    if (!salaryTemplatesExists) {
      await queryInterface.createTable('salary_templates', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Template name (e.g., Full-Time, Contract, Sales)',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Template version for versioning',
      },
      effective_from: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'When this template becomes active',
      },
      effective_to: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'When this template expires (null = active)',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      auto_balance_special_allowance: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Auto-adjust remaining CTC to Special Allowance',
      },
      applicable_to_grade: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Employee grade (optional filter)',
      },
      applicable_to_department: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Department (optional filter)',
      },
      applicable_to_designation: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Designation (optional filter)',
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
      });
    } else {
      console.log('  ℹ️ salary_templates table already exists, skipping creation');
    }

    // Add indexes if they don't exist
    try {
      await queryInterface.addIndex('salary_templates', ['name', 'version'], {
        name: 'idx_template_name_version',
        unique: true,
      });
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) {
        console.log('  ⚠️ Could not add index idx_template_name_version:', err.message);
      }
    }
    
    try {
      await queryInterface.addIndex('salary_templates', ['is_active', 'effective_from', 'effective_to'], {
        name: 'idx_template_active_dates',
      });
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) {
        console.log('  ⚠️ Could not add index idx_template_active_dates:', err.message);
      }
    }

    // 2. Template Components
    const templateComponentsExists = await queryInterface.tableExists('template_components');
    if (!templateComponentsExists) {
      await queryInterface.createTable('template_components', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      template_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'salary_templates', key: 'id', onDelete: 'CASCADE' },
      },
      component_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'e.g., Basic, HRA, PF, ESI',
      },
      component_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Unique code (BASIC, HRA, PF_EMP, etc.)',
      },
      component_type: {
        type: DataTypes.ENUM('earning', 'deduction', 'employer_contribution'),
        allowNull: false,
      },
      calculation_type: {
        type: DataTypes.ENUM('fixed', 'percent_of_ctc', 'percent_of_basic', 'percent_of_gross', 'formula'),
        allowNull: false,
      },
      value: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Fixed amount or percentage value',
      },
      formula_expression: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Formula expression (e.g., MIN(0.5*BASIC, RENT-0.1*BASIC))',
      },
      depends_on: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of component codes this depends on',
      },
      is_taxable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      affects_pf: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Does this component affect PF calculation?',
      },
      affects_esi: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Does this component affect ESI calculation?',
      },
      is_statutory: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Is this a statutory component (PF, ESI, PT)?',
      },
      is_locked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Locked components cannot be edited without admin override',
      },
      display_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
      });
    } else {
      console.log('  ℹ️ template_components table already exists, skipping creation');
    }

    // Add indexes if they don't exist
    try {
      await queryInterface.addIndex('template_components', ['template_id', 'component_code'], {
        name: 'idx_template_component_code',
        unique: true,
      });
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) {
        console.log('  ⚠️ Could not add index idx_template_component_code:', err.message);
      }
    }
    
    try {
      await queryInterface.addIndex('template_components', ['template_id', 'display_order'], {
        name: 'idx_template_display_order',
      });
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) {
        console.log('  ⚠️ Could not add index idx_template_display_order:', err.message);
      }
    }

    // 3. State Tax Slabs (Professional Tax)
    const stateTaxSlabsExists = await queryInterface.tableExists('state_tax_slabs');
    if (!stateTaxSlabsExists) {
      await queryInterface.createTable('state_tax_slabs', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      state: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      income_min: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      income_max: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'null = no upper limit',
      },
      tax_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      effective_from: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      effective_to: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
      });
    } else {
      console.log('  ℹ️ state_tax_slabs table already exists, skipping creation');
    }

    // Add index if it doesn't exist
    try {
      await queryInterface.addIndex('state_tax_slabs', ['state', 'income_min', 'income_max'], {
        name: 'idx_state_tax_slabs',
      });
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) {
        console.log('  ⚠️ Could not add index idx_state_tax_slabs:', err.message);
      }
    }

    // 4. Employee Salary Assignments
    const employeeSalaryAssignmentsExists = await queryInterface.tableExists('employee_salary_assignments');
    if (!employeeSalaryAssignmentsExists) {
      await queryInterface.createTable('employee_salary_assignments', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      employee_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        // Foreign key will be added separately
      },
      template_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'salary_templates', key: 'id' },
      },
      ctc_annual: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      effective_from: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      effective_to: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'null = currently active',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      calculated_components: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Snapshot of calculated salary components',
      },
      employer_cost_total: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Total employer cost including contributions',
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
      });
    } else {
      console.log('  ℹ️ employee_salary_assignments table already exists, skipping creation');
    }

    // Add indexes if they don't exist
    try {
      await queryInterface.addIndex('employee_salary_assignments', ['employee_id', 'effective_from'], {
        name: 'idx_emp_salary_effective',
      });
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) {
        console.log('  ⚠️ Could not add index idx_emp_salary_effective:', err.message);
      }
    }
    
    try {
      await queryInterface.addIndex('employee_salary_assignments', ['employee_id', 'is_active'], {
        name: 'idx_emp_salary_active',
      });
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) {
        console.log('  ⚠️ Could not add index idx_emp_salary_active:', err.message);
      }
    }

    // 5. Salary Revision History
    const salaryRevisionHistoryExists = await queryInterface.tableExists('salary_revision_history');
    if (!salaryRevisionHistoryExists) {
      await queryInterface.createTable('salary_revision_history', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      employee_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        // Foreign key will be added separately
      },
      assignment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'employee_salary_assignments', key: 'id' },
      },
      revision_type: {
        type: DataTypes.ENUM('ctc_change', 'template_change', 'component_override', 'promotion'),
        allowNull: false,
      },
      old_ctc: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      new_ctc: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      old_components: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Previous salary structure snapshot',
      },
      new_components: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'New salary structure snapshot',
      },
      changed_components: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of component codes that changed',
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      effective_from: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      });
    } else {
      console.log('  ℹ️ salary_revision_history table already exists, skipping creation');
    }

    // Add index if it doesn't exist
    try {
      await queryInterface.addIndex('salary_revision_history', ['employee_id', 'created_at'], {
        name: 'idx_salary_revision_emp_date',
      });
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) {
        console.log('  ⚠️ Could not add index idx_salary_revision_emp_date:', err.message);
      }
    }

    // 6. Variable Pay Definitions
    const variablePayDefinitionsExists = await queryInterface.tableExists('variable_pay_definitions');
    if (!variablePayDefinitionsExists) {
      await queryInterface.createTable('variable_pay_definitions', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      employee_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        // Foreign key will be added separately
      },
      variable_type: {
        type: DataTypes.ENUM('performance_bonus', 'joining_bonus', 'retention_bonus', 'quarterly_incentive', 'custom'),
        allowNull: false,
      },
      payout_frequency: {
        type: DataTypes.ENUM('monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time'),
        allowNull: false,
      },
      calculation_basis: {
        type: DataTypes.ENUM('percent_of_ctc', 'percent_of_basic', 'percent_of_gross', 'fixed_amount', 'formula'),
        allowNull: false,
      },
      value: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      formula_expression: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_taxable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      linked_to_cycle: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Does this affect monthly payroll cycle?',
      },
      effective_from: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      effective_to: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
      });
    } else {
      console.log('  ℹ️ variable_pay_definitions table already exists, skipping creation');
    }

    // Add index if it doesn't exist
    try {
      await queryInterface.addIndex('variable_pay_definitions', ['employee_id', 'is_active'], {
        name: 'idx_var_pay_emp_active',
      });
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) {
        console.log('  ⚠️ Could not add index idx_var_pay_emp_active:', err.message);
      }
    }

    // 7. Compliance Warnings Log
    const complianceWarningsExists = await queryInterface.tableExists('compliance_warnings');
    if (!complianceWarningsExists) {
      await queryInterface.createTable('compliance_warnings', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      employee_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'employees', key: 'id', onDelete: 'CASCADE' },
      },
      template_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'salary_templates', key: 'id', onDelete: 'CASCADE' },
      },
      warning_type: {
        type: DataTypes.ENUM('basic_percentage', 'pf_misconfiguration', 'esi_threshold', 'statutory_missing', 'formula_error', 'circular_dependency'),
        allowNull: false,
      },
      severity: {
        type: DataTypes.ENUM('info', 'warning', 'error'),
        allowNull: false,
        defaultValue: 'warning',
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      component_code: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      is_resolved: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      resolved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      resolved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      });
    } else {
      console.log('  ℹ️ compliance_warnings table already exists, skipping creation');
    }

    // Add indexes if they don't exist
    try {
      await queryInterface.addIndex('compliance_warnings', ['employee_id', 'is_resolved'], {
        name: 'idx_compliance_emp_resolved',
      });
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) {
        console.log('  ⚠️ Could not add index idx_compliance_emp_resolved:', err.message);
      }
    }
    
    try {
      await queryInterface.addIndex('compliance_warnings', ['template_id', 'is_resolved'], {
        name: 'idx_compliance_template_resolved',
      });
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) {
        console.log('  ⚠️ Could not add index idx_compliance_template_resolved:', err.message);
      }
    }

    // Add foreign key constraints separately (after all tables are created)
    try {
      await queryInterface.addConstraint('employee_salary_assignments', {
        fields: ['employee_id'],
        type: 'foreign key',
        name: 'fk_employee_salary_assignments_employee',
        references: {
          table: 'employees',
          field: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) {
        console.log('Note: Foreign key constraint may already exist or employees table structure differs');
      }
    }

    try {
      await queryInterface.addConstraint('salary_revision_history', {
        fields: ['employee_id'],
        type: 'foreign key',
        name: 'fk_salary_revision_history_employee',
        references: {
          table: 'employees',
          field: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) {
        console.log('Note: Foreign key constraint may already exist');
      }
    }

    try {
      await queryInterface.addConstraint('variable_pay_definitions', {
        fields: ['employee_id'],
        type: 'foreign key',
        name: 'fk_variable_pay_definitions_employee',
        references: {
          table: 'employees',
          field: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) {
        console.log('Note: Foreign key constraint may already exist');
      }
    }

    try {
      await queryInterface.addConstraint('compliance_warnings', {
        fields: ['employee_id'],
        type: 'foreign key',
        name: 'fk_compliance_warnings_employee',
        references: {
          table: 'employees',
          field: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    } catch (err) {
      if (!err.message.includes('Duplicate key name')) {
        console.log('Note: Foreign key constraint may already exist');
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('compliance_warnings');
    await queryInterface.dropTable('variable_pay_definitions');
    await queryInterface.dropTable('salary_revision_history');
    await queryInterface.dropTable('employee_salary_assignments');
    await queryInterface.dropTable('state_tax_slabs');
    await queryInterface.dropTable('template_components');
    await queryInterface.dropTable('salary_templates');
  },
};
