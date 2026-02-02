
import 'dotenv/config';
import { PayrollRun, Business } from './src/models/index.js';

async function diag() {
    try {
        console.log('DB_HOST:', process.env.DB_HOST);
        const runs = await PayrollRun.findAll();
        console.log(`Found ${runs.length} payroll runs.`);
        runs.forEach(r => {
            console.log(`- Run ID: ${r.id}, Business: ${r.businessId}, Status: ${r.status}, Period: ${r.periodMonth}/${r.periodYear}`);
        });
        process.exit(0);
    } catch (err) {
        console.error('Diag Error:', err.message);
        process.exit(1);
    }
}

diag();
