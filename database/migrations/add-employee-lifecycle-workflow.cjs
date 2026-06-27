/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('employees');

    if (!table.lifecycleStage) {
      await queryInterface.addColumn('employees', 'lifecycleStage', {
        type: Sequelize.ENUM(
          'prospect',
          'offer',
          'joining',
          'active',
          'confirmed',
          'offboarding',
          'exited'
        ),
        allowNull: false,
        defaultValue: 'prospect',
      });
    }

    if (!table.internStipend) {
      await queryInterface.addColumn('employees', 'internStipend', {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      });
    }

    if (!table.contractEndDate) {
      await queryInterface.addColumn('employees', 'contractEndDate', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
    }

    if (!table.empIncrementEffectiveDate) {
      await queryInterface.addColumn('employees', 'empIncrementEffectiveDate', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
    }

    const tables = await queryInterface.showAllTables();
    const hasGenerated = tables.includes('employee_generated_documents');
    if (!hasGenerated) {
      await queryInterface.createTable('employee_generated_documents', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        employeeId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'employees', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        documentTypeId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'document_types', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        fileName: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        filePath: {
          type: Sequelize.STRING(500),
          allowNull: false,
        },
        generatedByUserId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        metadata: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        version: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
      await queryInterface.addIndex('employee_generated_documents', ['employeeId'], {
        name: 'idx_emp_gen_docs_employee',
      });
      await queryInterface.addIndex('employee_generated_documents', ['code'], {
        name: 'idx_emp_gen_docs_code',
      });
    }

    const hasEvents = tables.includes('employee_lifecycle_events');
    if (!hasEvents) {
      await queryInterface.createTable('employee_lifecycle_events', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        employeeId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'employees', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        fromStage: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        toStage: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        action: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        actorUserId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        payload: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
      await queryInterface.addIndex('employee_lifecycle_events', ['employeeId'], {
        name: 'idx_emp_lifecycle_events_employee',
      });
    }

    // Backfill lifecycle stage for existing active employees
    try {
      await queryInterface.sequelize.query(`
        UPDATE employees
        SET lifecycleStage = 'active'
        WHERE lifecycleStage = 'prospect'
          AND employmentStatus = 'Active'
          AND isActive = 1
      `);
    } catch (e) {
      // column may not exist yet on first partial run
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('employee_lifecycle_events');
    await queryInterface.dropTable('employee_generated_documents');
    const table = await queryInterface.describeTable('employees');
    if (table.empIncrementEffectiveDate) {
      await queryInterface.removeColumn('employees', 'empIncrementEffectiveDate');
    }
    if (table.contractEndDate) {
      await queryInterface.removeColumn('employees', 'contractEndDate');
    }
    if (table.internStipend) {
      await queryInterface.removeColumn('employees', 'internStipend');
    }
    if (table.lifecycleStage) {
      await queryInterface.removeColumn('employees', 'lifecycleStage');
    }
  },
};
