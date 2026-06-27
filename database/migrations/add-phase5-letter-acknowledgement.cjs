/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('employee_generated_documents');
    if (!table.acknowledgedAt) {
      await queryInterface.addColumn('employee_generated_documents', 'acknowledgedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('employee_generated_documents');
    if (table.acknowledgedAt) {
      await queryInterface.removeColumn('employee_generated_documents', 'acknowledgedAt');
    }
  },
};
