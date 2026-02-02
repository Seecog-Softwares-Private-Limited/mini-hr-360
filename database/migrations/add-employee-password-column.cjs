// Migration: add-employee-password-column.cjs
module.exports = {
	up: async (queryInterface, Sequelize) => {
		// Add columns if they do not exist
		const tableDescription = await queryInterface.describeTable('employees');
		const columnsToAdd = [
			{
				name: 'password',
				definition: { type: Sequelize.STRING(255), allowNull: true, comment: 'Hashed password for employee portal login', after: 'systemRole' },
			},
			{
				name: 'role',
				definition: { type: Sequelize.ENUM('EMPLOYEE', 'MANAGER', 'HR'), allowNull: false, defaultValue: 'EMPLOYEE', comment: 'Role within employee portal', after: 'password' },
			},
			{
				name: 'canLogin',
				definition: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, comment: 'Whether employee can login to portal', after: 'role' },
			},
			{
				name: 'lastEmployeeLoginAt',
				definition: { type: Sequelize.DATE, allowNull: true, after: 'canLogin' },
			},
			{
				name: 'employeeRefreshToken',
				definition: { type: Sequelize.TEXT, allowNull: true, after: 'lastEmployeeLoginAt' },
			},
			{
				name: 'employeeRefreshTokenExpiresAt',
				definition: { type: Sequelize.DATE, allowNull: true, after: 'employeeRefreshToken' },
			},
			{
				name: 'businessId',
				definition: { type: Sequelize.INTEGER, allowNull: true, comment: 'Business this employee belongs to (for multi-tenancy)', after: 'employeeRefreshTokenExpiresAt' },
			},
		];
		for (const column of columnsToAdd) {
			if (!tableDescription[column.name]) {
				await queryInterface.addColumn('employees', column.name, column.definition);
			}
		}
	},
	down: async (queryInterface, Sequelize) => {
		// Remove columns (reverse migration)
		const columns = ['password', 'role', 'canLogin', 'lastEmployeeLoginAt', 'employeeRefreshToken', 'employeeRefreshTokenExpiresAt', 'businessId'];
		for (const column of columns) {
			// Remove ENUM type only for 'role'
			if (column === 'role') {
				await queryInterface.removeColumn('employees', column);
				await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_employees_role";');
			} else {
				await queryInterface.removeColumn('employees', column);
			}
		}
	}
};
