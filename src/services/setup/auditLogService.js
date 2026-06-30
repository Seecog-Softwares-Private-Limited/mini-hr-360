import AuditLog from '../../models/AuditLog.js';

export async function createAuditLog({
  userId,
  businessId,
  action,
  module = 'setup',
  oldValue = null,
  newValue = null,
  ipAddress = null,
}) {
  try {
    return await AuditLog.create({
      userId,
      businessId,
      action,
      module,
      oldValue,
      newValue,
      ipAddress,
    });
  } catch (err) {
    console.warn('Audit log failed:', err?.message);
    return null;
  }
}

export function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || null;
}
