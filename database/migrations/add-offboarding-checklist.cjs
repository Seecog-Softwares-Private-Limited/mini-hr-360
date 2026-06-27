/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('employees');
    if (!table.offboardingChecklist) {
      await queryInterface.addColumn('employees', 'offboardingChecklist', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('employees');
    if (table.offboardingChecklist) {
      await queryInterface.removeColumn('employees', 'offboardingChecklist');
    }
  },
};
