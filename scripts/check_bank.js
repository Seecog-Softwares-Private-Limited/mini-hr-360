import { PayrollSetting } from '../src/models/index.js';

(async function(){
  try {
    const businessId = process.env.BUSINESS_ID ? Number(process.env.BUSINESS_ID) : 1;
    console.log('Checking PayrollSetting for businessId=', businessId);
    const rec = await PayrollSetting.findOne({ where: { businessId } });
    if (!rec) {
      console.log('No payroll setting found for businessId', businessId);
      process.exit(0);
    }
    console.log('PayrollSetting id=', rec.id);
    console.log('bankDetails=', JSON.stringify(rec.bankDetails || rec.get('bankDetails') || {}, null, 2));
  } catch (err) {
    console.error('Error checking payroll setting:', err && (err.stack || err.message || err));
    process.exit(2);
  } finally {
    process.exit(0);
  }
})();
