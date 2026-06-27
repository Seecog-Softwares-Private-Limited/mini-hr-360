/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('candidates')) {
      await queryInterface.createTable('candidates', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        businessId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'businesses', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        firstName: { type: Sequelize.STRING(100), allowNull: false },
        lastName: { type: Sequelize.STRING(100), allowNull: false },
        email: { type: Sequelize.STRING(255), allowNull: false },
        phone: { type: Sequelize.STRING(20), allowNull: true },
        employeeType: {
          type: Sequelize.ENUM('Permanent', 'Contract', 'Intern', 'Consultant', 'Trainee'),
          defaultValue: 'Permanent',
        },
        designation: { type: Sequelize.STRING(255), allowNull: true },
        department: { type: Sequelize.STRING(255), allowNull: true },
        expectedCtc: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
        internStipend: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
        tentativeJoiningDate: { type: Sequelize.DATEONLY, allowNull: true },
        workLocation: { type: Sequelize.STRING(255), allowNull: true },
        source: { type: Sequelize.STRING(100), allowNull: true },
        status: {
          type: Sequelize.ENUM(
            'prospect',
            'offer_pending',
            'offer_sent',
            'accepted',
            'rejected',
            'converted'
          ),
          defaultValue: 'prospect',
        },
        notes: { type: Sequelize.TEXT, allowNull: true },
        convertedEmployeeId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'employees', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        createdByUserId: {
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
      await queryInterface.addIndex('candidates', ['businessId'], { name: 'idx_candidates_business' });
      await queryInterface.addIndex('candidates', ['status'], { name: 'idx_candidates_status' });
    }

    if (!tables.includes('document_approval_requests')) {
      await queryInterface.createTable('document_approval_requests', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
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
        documentTypeId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'document_types', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        code: { type: Sequelize.STRING(50), allowNull: false },
        fileName: { type: Sequelize.STRING(255), allowNull: false },
        filePath: { type: Sequelize.STRING(500), allowNull: false },
        status: {
          type: Sequelize.ENUM('pending', 'approved', 'rejected'),
          defaultValue: 'pending',
        },
        requestedByUserId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        reviewedByUserId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        reviewNote: { type: Sequelize.TEXT, allowNull: true },
        metadata: { type: Sequelize.JSON, allowNull: true },
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
      await queryInterface.addIndex('document_approval_requests', ['businessId', 'status'], {
        name: 'idx_doc_approvals_business_status',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('document_approval_requests');
    await queryInterface.dropTable('candidates');
  },
};
