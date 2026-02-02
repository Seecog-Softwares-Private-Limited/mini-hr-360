'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'version' column
    await queryInterface.addColumn('salary_structures', 'version', {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      allowNull: true,
    });

    // Add 'status' column
    await queryInterface.addColumn('salary_structures', 'status', {
      type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
      defaultValue: 'ACTIVE',
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('salary_structures', 'version');
    await queryInterface.removeColumn('salary_structures', 'status');
  },
};
