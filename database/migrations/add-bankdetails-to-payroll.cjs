module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('payroll_settings', 'bankDetails', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: {},
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('payroll_settings', 'bankDetails');
  }
};
