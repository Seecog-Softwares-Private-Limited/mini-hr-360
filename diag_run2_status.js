
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('mini_hr_360', 'root', 'Nikhil-700', {
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    logging: false
});

async function diag() {
    try {
        const [runs] = await sequelize.query("SELECT * FROM payroll_runs WHERE id = 2");
        if (runs.length > 0) {
            console.log(`Run 2 Status: '${runs[0].status}'`);
        } else {
            console.log('Run 2 NOT FOUND');
        }

        const [payslips] = await sequelize.query("SELECT count(*) as count FROM payslips WHERE payrollRunId = 2");
        console.log(`Existing Payslips for Run 2: ${payslips[0].count}`);

        process.exit(0);
    } catch (err) {
        console.error('Diag Error:', err.message);
        process.exit(1);
    }
}

diag();
