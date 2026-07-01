/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('employee_assets')) return;

    await queryInterface.createTable('employee_assets', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      businessId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'businesses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      employeeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      assetType: {
        type: Sequelize.ENUM('Laptop', 'Mobile', 'Access Card', 'Monitor', 'Headset', 'Other'),
        allowNull: false,
        defaultValue: 'Laptop',
      },
      assetName: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      assetTag: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      brand: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      model: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      assignedDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      returnedDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('Assigned', 'Returned', 'Lost', 'Damaged'),
        allowNull: false,
        defaultValue: 'Assigned',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      assignedByUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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

    await queryInterface.addIndex('employee_assets', ['businessId']);
    await queryInterface.addIndex('employee_assets', ['employeeId']);
    await queryInterface.addIndex('employee_assets', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('employee_assets');
  },
};
