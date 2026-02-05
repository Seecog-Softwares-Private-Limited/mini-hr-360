module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('payroll_settings', 'financialYearStart', {
      type: Sequelize.STRING(10),
      allowNull: false,
      defaultValue: 'APR'
    });

    await queryInterface.addColumn('payroll_settings', 'proration', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('payroll_settings', 'financialYearStart');
    await queryInterface.removeColumn('payroll_settings', 'proration');
  }
};
