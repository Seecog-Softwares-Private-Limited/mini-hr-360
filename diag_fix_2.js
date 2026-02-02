
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'property.env') });

import { PayrollRun } from './src/models/index.js';

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
