
import { PayrollRun } from './src/models/index.js';

async function checkRuns() {
    try {
        const runs = await PayrollRun.findAll();
        console.log('Payroll Runs:');
        runs.forEach(run => {
            console.log(`ID: ${run.id}, BusinessID: ${run.businessId}, Status: ${run.status}, Period: ${run.periodYear}-${run.periodMonth}`);
        });
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkRuns();
