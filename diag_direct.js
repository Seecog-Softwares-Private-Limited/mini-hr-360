
import { Sequelize, DataTypes } from 'sequelize';

const sequelize = new Sequelize('mini_hr_360', 'root', 'Nikhil-700', {
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    logging: false
});

async function diag() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        // Check if table exists
        const [tables] = await sequelize.query("SHOW TABLES LIKE 'payroll_runs'");
        if (tables.length === 0) {
            console.log('Table payroll_runs does NOT exist!');
            process.exit(0);
        }

        const [runs] = await sequelize.query("SELECT * FROM payroll_runs");
        console.log(`Found ${runs.length} rows in payroll_runs table.`);
        runs.forEach(r => {
            console.log(`- ID: ${r.id}, BusinessID: ${r.businessId}, Status: ${r.status}, Period: ${r.periodMonth}/${r.periodYear}`);
        });

        const [payslips] = await sequelize.query("SELECT * FROM payslips");
        console.log(`Found ${payslips.length} rows in payslips table.`);

        process.exit(0);
    } catch (err) {
        console.error('Diag Error:', err.message);
        process.exit(1);
    }
}

diag();
