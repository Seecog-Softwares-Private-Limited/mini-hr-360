// Migration: add-leave-type-columns.cjs
module.exports = {
	up: async (queryInterface, Sequelize) => {
		const tableDescription = await queryInterface.describeTable('leave_types');
		const columnsToAdd = [
			{ name: 'isPaid', definition: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true, comment: 'Whether this leave type is paid', after: 'status' } },
			{ name: 'allowHalfDay', definition: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true, comment: 'Whether half-day leave is allowed', after: 'isPaid' } },
			{ name: 'maxPerYear', definition: { type: Sequelize.DECIMAL(5,2), allowNull: true, comment: 'Maximum leaves allowed per year (null = unlimited)', after: 'allowHalfDay' } },
			{ name: 'allowCarryForward', definition: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, comment: 'Whether unused leaves can be carried forward', after: 'maxPerYear' } },
			{ name: 'maxCarryForward', definition: { type: Sequelize.DECIMAL(5,2), allowNull: true, comment: 'Maximum leaves that can be carried forward', after: 'allowCarryForward' } },
			{ name: 'requiresAttachment', definition: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, comment: 'Whether attachment is required for this leave type', after: 'maxCarryForward' } },
			{ name: 'minDaysNotice', definition: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0, comment: 'Minimum days notice required for applying', after: 'requiresAttachment' } },
			{ name: 'color', definition: { type: Sequelize.STRING(20), allowNull: true, defaultValue: '#6366f1', comment: 'Color code for UI display', after: 'minDaysNotice' } },
		];
		for (const column of columnsToAdd) {
			if (!tableDescription[column.name]) {
				await queryInterface.addColumn('leave_types', column.name, column.definition);
			}
		}
	},
	down: async (queryInterface, Sequelize) => {
		const columns = ['isPaid', 'allowHalfDay', 'maxPerYear', 'allowCarryForward', 'maxCarryForward', 'requiresAttachment', 'minDaysNotice', 'color'];
		for (const column of columns) {
			await queryInterface.removeColumn('leave_types', column);
		}
	}
};
