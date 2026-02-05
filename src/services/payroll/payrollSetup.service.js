import PayrollSetting from '../../models/payrollSetting.js';

export const getSetup = async (businessId) => {
  const rec = await PayrollSetting.findOne({ where: { businessId } });
  if (!rec) return null;
  const data = rec.toJSON();
  const tmpl = (data.statutoryConfig && data.statutoryConfig.template) || {};
  return {
    // expose full setting object so views can render badges and workflow
    ...data,
    companyName: tmpl.companyName || null,
    companyAddress: tmpl.companyAddress || null,
    payslipFooter: tmpl.payslipFooter || null,
    logoUrl: tmpl.logoUrl || null,
    // ensure structural fields are present for UI checks
    statutoryConfig: data.statutoryConfig || {},
    approvalWorkflow: data.approvalWorkflow || {},
    bankDetails: data.bankDetails || {},
  };
};

// Only persist attributes that are defined on the model to avoid SQL errors
// IMPORTANT: This function now MERGES with existing data instead of overwriting
export const saveSetup = async (businessId, payload) => {
  const modelAttrs = Object.keys(PayrollSetting.rawAttributes || {});

  // First, get the existing record to merge with
  let existingRecord = await PayrollSetting.findOne({ where: { businessId } });
  const existingData = existingRecord ? existingRecord.toJSON() : {};

  // Build sanitized payload containing only known attributes
  const sanitized = {};
  for (const k of modelAttrs) {
    if (k === 'id' || k === 'createdAt' || k === 'updatedAt') continue;
    if (k === 'businessId') continue; // will be added explicitly
    if (Object.prototype.hasOwnProperty.call(payload, k)) {
      sanitized[k] = payload[k];
    }
  }

  // Handle payDay and cutoffDay - ensure they have valid defaults
  if (!sanitized.payDay && sanitized.payDay !== 0) {
    sanitized.payDay = existingData.payDay || 25;
  }
  if (!sanitized.cutoffDay && sanitized.cutoffDay !== 0) {
    sanitized.cutoffDay = existingData.cutoffDay || 20;
  }

  // Move payslip template fields into statutoryConfig.template
  const templateFields = {};
  ['companyName', 'companyAddress', 'payslipFooter', 'logoUrl'].forEach(k => {
    if (Object.prototype.hasOwnProperty.call(payload, k) && payload[k] !== undefined && payload[k] !== '') {
      templateFields[k] = payload[k];
    }
  });

  // MERGE statutoryConfig with existing data instead of overwriting
  const existingStat = existingData.statutoryConfig || {};
  const newStat = sanitized.statutoryConfig || {};
  
  // Deep merge: preserve existing values, overlay new values
  const mergedStat = {
    ...existingStat,
    ...newStat,
    // Preserve existing template and merge with new template fields
    template: {
      ...(existingStat.template || {}),
      ...(newStat.template || {}),
      ...templateFields,
    },
    // Preserve components if they exist in new payload, otherwise keep existing
    components: newStat.components || existingStat.components || [],
  };
  
  sanitized.statutoryConfig = mergedStat;

  // MERGE bankDetails with existing data
  const existingBank = existingData.bankDetails || {};
  const newBank = sanitized.bankDetails || {};
  sanitized.bankDetails = { ...existingBank, ...newBank };

  // MERGE approvalWorkflow with existing data
  const existingWorkflow = existingData.approvalWorkflow || {};
  const newWorkflow = sanitized.approvalWorkflow || {};
  // For workflow, if new steps are provided, use them; otherwise keep existing
  sanitized.approvalWorkflow = {
    ...existingWorkflow,
    ...newWorkflow,
    steps: newWorkflow.steps && newWorkflow.steps.length > 0 ? newWorkflow.steps : (existingWorkflow.steps || []),
  };

  if (existingRecord) {
    await existingRecord.update(sanitized);
    await existingRecord.reload();
    return existingRecord.toJSON();
  } else {
    // Create new record with defaults
    const newRecord = await PayrollSetting.create({
      ...sanitized,
      businessId,
      payDay: sanitized.payDay || 25,
      cutoffDay: sanitized.cutoffDay || 20,
    });
    return newRecord.toJSON();
  }
};
