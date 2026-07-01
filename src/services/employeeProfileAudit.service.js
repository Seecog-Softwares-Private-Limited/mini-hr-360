import { createAuditLog, getClientIp } from './setup/auditLogService.js';

export async function logEmployeeProfileAction(req, {
  businessId,
  employeeId,
  action,
  oldValue = null,
  newValue = null,
}) {
  if (!businessId || !employeeId || !action) return null;

  return createAuditLog({
    userId: req.user?.id || null,
    businessId,
    action,
    module: 'employee_profile',
    oldValue: oldValue != null ? { employeeId, ...oldValue } : { employeeId },
    newValue: newValue != null ? { employeeId, ...newValue } : { employeeId },
    ipAddress: getClientIp(req),
  });
}

export function profileTabHref(employeeId, tab) {
  return `/employees/${employeeId}?tab=${tab}`;
}

export function missingDataProfileTab(missingFields = []) {
  const fields = Array.isArray(missingFields) ? missingFields : [];
  if (fields.some((f) => /bank/i.test(f))) return 'bank';
  if (fields.some((f) => /pan|statutory|uan|esi/i.test(f))) return 'statutory';
  if (fields.some((f) => /salary|structure|ctc/i.test(f))) return 'salary';
  if (fields.some((f) => /designation|department|manager|shift/i.test(f))) return 'job';
  return 'profile';
}
