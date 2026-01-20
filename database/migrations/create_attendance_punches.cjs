// Migration: create_attendance_punches.cjs
module.exports = {
	up: async (queryInterface, Sequelize) => {
		await queryInterface.createTable('attendance_punches', {
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
			punchIn: {
				type: Sequelize.DATE,
				allowNull: false
			},
			punchOut: {
				type: Sequelize.DATE,
				allowNull: true
			},
			punchType: {
				type: Sequelize.STRING(20),
				allowNull: false,
				defaultValue: 'IN'
			},
			location: {
				type: Sequelize.STRING(100),
				allowNull: true
			},
			device: {
				type: Sequelize.STRING(100),
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
		await queryInterface.dropTable('attendance_punches');
	}
};
