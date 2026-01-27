import PayrollSetting from '../../models/payrollSetting.js';

export const calculateStatutoryDeductions = async ({
  businessId,
  grossPay,
  earnings,
}) => {
  const setting = await PayrollSetting.findOne({ where: { businessId } });
  if (!setting) return {};

  const statutory = {};
  const config = setting.statutoryConfig || {};

  /* PF */
  if (config.pf?.enabled) {
    const basic = earnings.Basic || 0;
    const pfPercent = config.pf.percent || 12;
    statutory.PF = (basic * pfPercent) / 100;
  }

  /* ESI */
  if (config.esi?.enabled && grossPay <= (config.esi.wageLimit || 21000)) {
    statutory.ESI = (grossPay * (config.esi.percent || 0.75)) / 100;
  }

  /* Professional Tax */
  if (config.pt?.enabled) {
    statutory.PT = config.pt.amount || 200;
  }

  /* TDS (simple slab-based placeholder) */
  if (config.tds?.enabled) {
    statutory.TDS = Math.round(grossPay * (config.tds.percent || 5) / 100);
  }

  return statutory;
};
