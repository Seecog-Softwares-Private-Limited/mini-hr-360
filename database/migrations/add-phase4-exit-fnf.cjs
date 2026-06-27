/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('employees');
    if (!table.fnfSettlement) {
      await queryInterface.addColumn('employees', 'fnfSettlement', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Full & final settlement earnings/deductions draft',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('employees');
    if (table.fnfSettlement) {
      await queryInterface.removeColumn('employees', 'fnfSettlement');
    }
  },
};
