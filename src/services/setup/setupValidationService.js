const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePan(pan) {
  if (!pan) return null;
  const v = String(pan).trim().toUpperCase();
  if (!PAN_REGEX.test(v)) return 'Invalid PAN format (e.g. ABCDE1234F)';
  return null;
}

export function validateGst(gst) {
  if (!gst) return null;
  const v = String(gst).trim().toUpperCase();
  if (!GST_REGEX.test(v)) return 'Invalid GST format';
  return null;
}

export function validateTan(tan) {
  if (!tan) return null;
  const v = String(tan).trim().toUpperCase();
  if (!TAN_REGEX.test(v)) return 'Invalid TAN format (e.g. ABCD12345E)';
  return null;
}

export function validatePincode(pincode) {
  if (!pincode) return 'Pincode is required';
  if (!PINCODE_REGEX.test(String(pincode).trim())) return 'Invalid pincode (6 digits)';
  return null;
}

export function validateEmail(email) {
  if (!email) return 'Email is required';
  if (!EMAIL_REGEX.test(String(email).trim())) return 'Invalid email format';
  return null;
}

export function validateCompanyDetails(data) {
  const errors = [];
  if (!data.legalName?.trim() && !data.businessName?.trim()) {
    errors.push({ field: 'legalName', message: 'Legal company name is required' });
  }
  if (!data.panNumber?.trim()) {
    errors.push({ field: 'panNumber', message: 'PAN number is required' });
  } else {
    const panErr = validatePan(data.panNumber);
    if (panErr) errors.push({ field: 'panNumber', message: panErr });
  }
  const gstErr = validateGst(data.gstNumber);
  if (gstErr) errors.push({ field: 'gstNumber', message: gstErr });
  const tanErr = validateTan(data.tanNumber);
  if (tanErr) errors.push({ field: 'tanNumber', message: tanErr });
  if (!data.registeredAddress?.trim() && !data.fullAddress?.trim()) {
    errors.push({ field: 'registeredAddress', message: 'Registered address is required' });
  }
  if (!data.city?.trim()) errors.push({ field: 'city', message: 'City is required' });
  if (!data.state?.trim()) errors.push({ field: 'state', message: 'State is required' });
  if (!data.country?.trim()) errors.push({ field: 'country', message: 'Country is required' });
  const pinErr = data.pincode ? validatePincode(data.pincode) : 'Pincode is required';
  if (pinErr) errors.push({ field: 'pincode', message: pinErr });
  if (!data.timezone?.trim()) errors.push({ field: 'timezone', message: 'Timezone is required' });
  return errors;
}

export function validateBranch(data) {
  const errors = [];
  if (!data.name?.trim()) errors.push({ field: 'name', message: 'Branch name is required' });
  const pinErr = data.pincode ? validatePincode(data.pincode) : 'Pincode is required';
  if (pinErr) errors.push({ field: 'pincode', message: pinErr });
  return errors;
}

export function validateLeavePolicy(data) {
  const errors = [];
  if (!data.name?.trim()) errors.push({ field: 'name', message: 'Leave type name is required' });
  if (!data.code?.trim()) errors.push({ field: 'code', message: 'Leave code is required' });
  const quota = Number(data.maxPerYear ?? data.annualQuota);
  if (Number.isNaN(quota) || quota < 0) {
    errors.push({ field: 'maxPerYear', message: 'Annual quota must be >= 0' });
  }
  const maxCf = data.maxCarryForward != null ? Number(data.maxCarryForward) : null;
  if (maxCf != null && !Number.isNaN(quota) && maxCf > quota) {
    errors.push({ field: 'maxCarryForward', message: 'Max carry forward cannot exceed annual quota' });
  }
  return errors;
}

export function validateAttendanceRules(data) {
  const errors = [];
  if (data.gracePeriodMinutes != null && Number(data.gracePeriodMinutes) < 0) {
    errors.push({ field: 'gracePeriodMinutes', message: 'Grace period must be >= 0' });
  }
  const half = Number(data.halfDayThresholdHours);
  const full = Number(data.fullDayThresholdHours);
  if (!Number.isNaN(half) && !Number.isNaN(full) && full <= half) {
    errors.push({ field: 'fullDayThresholdHours', message: 'Full-day threshold must be greater than half-day threshold' });
  }
  if (data.attendanceLockDay != null) {
    const day = Number(data.attendanceLockDay);
    if (day < 1 || day > 31) {
      errors.push({ field: 'attendanceLockDay', message: 'Attendance lock day must be between 1 and 31' });
    }
  }
  return errors;
}

export function validateSalaryComponent(data) {
  const errors = [];
  if (!data.name?.trim()) errors.push({ field: 'name', message: 'Component name is required' });
  if (!data.code?.trim()) errors.push({ field: 'code', message: 'Component code is required' });
  if (!data.componentType && !data.type) {
    errors.push({ field: 'componentType', message: 'Component type is required' });
  }
  const calc = data.calculationType;
  if (calc === 'FORMULA' && !data.formula?.trim()) {
    errors.push({ field: 'formula', message: 'Formula is required when calculation type is formula' });
  }
  if ((calc === 'FIXED' || calc === 'PERCENTAGE') && data.value == null) {
    errors.push({ field: 'value', message: 'Value is required for fixed/percentage calculation' });
  }
  return errors;
}

export function validateStatutory(data) {
  const errors = [];
  if (data.pfEnabled && !data.pfEstablishmentNumber?.trim()) {
    errors.push({ field: 'pfEstablishmentNumber', message: 'PF establishment number is required when PF is enabled', severity: 'critical' });
  }
  if (data.esiEnabled && !data.esiEmployerCode?.trim()) {
    errors.push({ field: 'esiEmployerCode', message: 'ESI employer code is required when ESI is enabled', severity: 'critical' });
  }
  if (data.tdsEnabled) {
    const tanErr = validateTan(data.tanNumber);
    if (tanErr || !data.tanNumber?.trim()) {
      errors.push({ field: 'tanNumber', message: tanErr || 'TAN is required when TDS is enabled', severity: 'critical' });
    }
  }
  const needsBank = data.pfEnabled || data.esiEnabled || data.tdsEnabled || data.payrollEnabled !== false;
  if (needsBank) {
    if (!data.payrollBankAccountNumber?.trim()) {
      errors.push({ field: 'payrollBankAccountNumber', message: 'Payroll bank account number is required', severity: 'critical' });
    }
    if (!data.payrollBankIfsc?.trim()) {
      errors.push({ field: 'payrollBankIfsc', message: 'Bank IFSC is required', severity: 'critical' });
    }
    if (!data.payrollBankName?.trim()) {
      errors.push({ field: 'payrollBankName', message: 'Bank name is required', severity: 'critical' });
    }
  }
  return errors;
}
