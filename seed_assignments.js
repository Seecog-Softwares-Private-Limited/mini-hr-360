
import { EmployeeSalaryAssignment } from './src/models/index.js';
import { sequelize } from './src/db/index.js';

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        await EmployeeSalaryAssignment.bulkCreate([
            { businessId: 26, employeeId: 4, salaryStructureId: 1, effectiveFrom: '2026-01-01' },
            { businessId: 26, employeeId: 5, salaryStructureId: 1, effectiveFrom: '2026-01-01' },
            { businessId: 26, employeeId: 6, salaryStructureId: 1, effectiveFrom: '2026-01-01' }
        ]);

        console.log('Successfully assigned structures');
        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
}

seed();
