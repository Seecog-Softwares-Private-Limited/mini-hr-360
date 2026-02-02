import PayrollSetting from '../../models/payrollSetting.js';

export const calculateStatutoryDeductions = async ({
  businessId,
  grossPay,
  earnings,
}) => {
  const setting = await PayrollSetting.findOne({ where: { businessId } });
  if (!setting) return {};

  const statutory = {};
  const cfg = setting.statutoryConfig || {};

  // normalize config to support both old boolean flags and nested objects
  const pfEnabled = Boolean(cfg.PF || cfg.pf?.enabled || cfg.pf);
  const esiEnabled = Boolean(cfg.ESI || cfg.esi?.enabled || cfg.esi);
  const ptEnabled = Boolean(cfg.PT || cfg.pt?.enabled || cfg.pt);
  const tdsEnabled = Boolean(cfg.TDS || cfg.tds?.enabled || cfg.tds);

  // pf ceiling may be provided as top-level pfCeiling or nested cfg.pf.ceiling
  const pfCeiling = Number(cfg.pfCeiling || cfg.pf?.ceiling || cfg.pf?.limit || 0) || 0;
  const pfPercent = Number(cfg.pfPercent || cfg.pf?.percent || 12) || 12;

  // esi wage limit may be provided as esiWageLimit or cfg.esi.wageLimit
  const esiWageLimit = Number(cfg.esiWageLimit || cfg.esi?.wageLimit || cfg.esi?.limit || 21000) || 21000;
  const esiPercent = Number(cfg.esiPercent || cfg.esi?.percent || 0.75) || 0.75;

  /* PF: calculated on Basic (with optional ceiling) */
  if (pfEnabled) {
    const basic = Number(earnings.Basic || earnings.BASIC || earnings.BasicSalary || 0) || 0;
    const baseForPf = pfCeiling > 0 ? Math.min(basic, pfCeiling) : basic;
    statutory.PF = Math.round((baseForPf * pfPercent) / 100 * 100) / 100;
  }

  /* ESI: employee contribution if grossPay <= wage limit */
  if (esiEnabled && Number(grossPay || 0) <= esiWageLimit) {
    statutory.ESI = Math.round((Number(grossPay || 0) * (esiPercent / 100)) * 100) / 100;
  }

  /* Professional Tax */
  if (ptEnabled) {
    // PT amount may be provided as cfg.ptAmount or cfg.pt.amount
    const ptAmount = Number(cfg.ptAmount || cfg.pt?.amount || 200) || 200;
    statutory.PT = ptAmount;
  }

  /* TDS (simple placeholder percent) */
  if (tdsEnabled) {
    const tdsPercent = Number(cfg.tdsPercent || cfg.tds?.percent || 5) || 5;
    statutory.TDS = Math.round(Number(grossPay || 0) * (tdsPercent / 100));
  }

  return statutory;
};
