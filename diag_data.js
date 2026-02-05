
import { PayrollRun, Business } from './src/models/index.js';

async function diag() {
    try {
        const runs = await PayrollRun.findAll();
        const businesses = await Business.findAll();

        console.log('--- Businesses ---');
        businesses.forEach(b => console.log(`ID: ${b.id}, Name: ${b.businessName}`));

        console.log('--- Payroll Runs ---');
        runs.forEach(r => {
            console.log(`Run ID: ${r.id}, Business ID: ${r.businessId}, Status: ${r.status}, Period: ${r.periodYear}-${r.periodMonth}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

diag();
