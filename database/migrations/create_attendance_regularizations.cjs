// Migration: create_attendance_regularizations.cjs
module.exports = {
	up: async (queryInterface, Sequelize) => {
		await queryInterface.createTable('attendance_regularizations', {
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
				allowNull: false
			},
			employeeId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: 'employees', key: 'id' },
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE',
			},
			date: {
				type: Sequelize.DATEONLY,
				allowNull: false
			},
			reason: {
				type: Sequelize.STRING(255),
				allowNull: false
			},
			status: {
				type: Sequelize.STRING(20),
				allowNull: false,
				defaultValue: 'PENDING'
			},
			approvedBy: {
				type: Sequelize.INTEGER,
				allowNull: true,
				references: { model: 'employees', key: 'id' },
				onUpdate: 'CASCADE',
				onDelete: 'SET NULL',
			},
			approvedAt: {
				type: Sequelize.DATE,
				allowNull: true
			},
			createdAt: {
				type: Sequelize.DATE,
				allowNull: false,
				defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
			},
			updatedAt: {
				type: Sequelize.DATE,
				allowNull: false,
				defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
			}
		});
	},
	down: async (queryInterface, Sequelize) => {
		await queryInterface.dropTable('attendance_regularizations');
	}
};
