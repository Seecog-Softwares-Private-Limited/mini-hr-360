module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('employees');
    
    if (!table.designationId) {
      await queryInterface.addColumn('employees', 'designationId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'designations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('employees', 'designationId');
  }
};
