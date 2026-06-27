/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('employees');

    if (!table.internStipend) {
      await queryInterface.addColumn('employees', 'internStipend', {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      });
      console.log('  + added employees.internStipend');
    }

    if (!table.contractEndDate) {
      await queryInterface.addColumn('employees', 'contractEndDate', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
      console.log('  + added employees.contractEndDate');
    }

    if (!table.empIncrementEffectiveDate) {
      await queryInterface.addColumn('employees', 'empIncrementEffectiveDate', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
      console.log('  + added employees.empIncrementEffectiveDate');
    }

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
      console.log('  + added employees.lifecycleStage');
    }

    if (!table.offboardingChecklist) {
      await queryInterface.addColumn('employees', 'offboardingChecklist', {
        type: Sequelize.JSON,
        allowNull: true,
      });
      console.log('  + added employees.offboardingChecklist');
    }

    if (!table.fnfSettlement) {
      await queryInterface.addColumn('employees', 'fnfSettlement', {
        type: Sequelize.JSON,
        allowNull: true,
      });
      console.log('  + added employees.fnfSettlement');
    }
  },

  async down() {
    // Repair migration — no down
  },
};
