import Employee from '../models/Employee.js';

export function normalizePhoneDigits(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 10 ? digits : null;
}

const PLACEHOLDER_PHONE_MAX = 10000;

export async function resolveUniqueEmployeePhone(userId, rawPhone) {
  const normalized = normalizePhoneDigits(rawPhone);
  if (normalized) {
    const existing = await Employee.findOne({
      where: { userId, empPhone: normalized },
      attributes: ['id'],
    });
    if (!existing) return normalized;

    const err = new Error('Phone number is already assigned to another employee');
    err.statusCode = 400;
    throw err;
  }

  for (let n = 0; n < PLACEHOLDER_PHONE_MAX; n++) {
    const placeholder = `9000${String(n).padStart(6, '0')}`;
    const existing = await Employee.findOne({
      where: { userId, empPhone: placeholder },
      attributes: ['id'],
    });
    if (!existing) return placeholder;
  }

  const err = new Error('Unable to allocate a unique placeholder phone number');
  err.statusCode = 500;
  throw err;
}
