import * as s from './src/services/payroll/payrollRun.service.js';
try {
    const data = await s.getRegister(1);
    console.log('DATA:', JSON.stringify(data, null, 2));
} catch (e) {
    console.log('ERROR:', e.message);
    console.log('STACK:', e.stack);
}
process.exit();
