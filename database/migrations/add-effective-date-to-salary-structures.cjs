// Migration: Add effectiveDate column to salary_structures table
const { Sequelize } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('salary_structures').catch(() => null);
    
    if (tableInfo && !tableInfo.effectiveDate) {
      await queryInterface.addColumn('salary_structures', 'effectiveDate', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
      console.log('Added effectiveDate column to salary_structures table');
    } else if (tableInfo && tableInfo.effectiveDate) {
      console.log('effectiveDate column already exists in salary_structures table');
    }
  },
  
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('salary_structures', 'effectiveDate');
  }
};
