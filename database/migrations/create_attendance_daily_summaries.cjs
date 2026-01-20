// Migration: create_attendance_daily_summaries.cjs
module.exports = {
	up: async (queryInterface, Sequelize) => {
		await queryInterface.createTable('attendance_daily_summaries', {
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
			status: {
				type: Sequelize.STRING(20),
				allowNull: false
			},
			totalHours: {
				type: Sequelize.DECIMAL(5,2),
				allowNull: true
			},
			lateBy: {
				type: Sequelize.DECIMAL(5,2),
				allowNull: true
			},
			earlyBy: {
				type: Sequelize.DECIMAL(5,2),
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
		await queryInterface.dropTable('attendance_daily_summaries');
	}
};
