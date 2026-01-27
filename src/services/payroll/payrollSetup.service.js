import PayrollSetting from '../../models/payrollSetting.js';

export const getSetup = async (businessId) => {
  
  return PayrollSetting.findOne({ where: { businessId } });
};

export const saveSetup = async (businessId, payload) => {
  const [record] = await PayrollSetting.findOrCreate({
    where: { businessId },
    defaults: { ...payload, businessId },
  });

  if (!record.isNewRecord) {
    await record.update(payload);
  }

  return record;
};
