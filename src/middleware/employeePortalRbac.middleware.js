import { asyncHandler } from '../utils/asyncHandler.js';
import {
  buildPortalAccessFlags,
  buildPortalNavigation,
  resolveEmployeePortalRole,
  roleHasPermission,
} from '../services/employeePortalPermissions.service.js';
import { resolveEmployeeDisplayRole } from '../utils/roleLabel.util.js';

function shouldRedirectHtml(req) {
  const accept = String(req.headers?.accept || '');
  return req.method === 'GET' && accept.includes('text/html') && !req.xhr;
}

/**
 * Attach portal role, permissions, and filtered navigation to every employee request.
 */
export const attachEmployeePortalContext = asyncHandler(async (req, res, next) => {
  if (!req.employee) return next();

  const portalRole = await resolveEmployeePortalRole(req.employee);
  req.portalRole = portalRole;
  req.portalAccess = buildPortalAccessFlags(portalRole);
  req.portalNav = buildPortalNavigation(portalRole);

  res.locals.portalRole = portalRole;
  res.locals.portalAccess = req.portalAccess;
  res.locals.portalNav = req.portalNav;
  res.locals.employee = req.employee;
  res.locals.employeeDisplayRole = resolveEmployeeDisplayRole(req.employee);

  next();
});

/**
 * Require a specific portal permission. Returns 403 JSON or HTML unauthorized page.
 */
export function requirePortalPermission(...permissions) {
  return asyncHandler(async (req, res, next) => {
    if (!req.employee) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!req.portalRole) {
      const portalRole = await resolveEmployeePortalRole(req.employee);
      req.portalRole = portalRole;
      req.portalAccess = buildPortalAccessFlags(portalRole);
      req.portalNav = buildPortalNavigation(portalRole);
      res.locals.portalRole = portalRole;
      res.locals.portalAccess = req.portalAccess;
      res.locals.portalNav = req.portalNav;
    }

    const allowed = permissions.some((perm) => roleHasPermission(req.portalRole, perm));
    if (!allowed) {
      if (shouldRedirectHtml(req)) {
        return res.status(403).render('employee/unauthorized', {
          layout: 'employee-main',
          title: 'Access Denied',
          active: 'unauthorized',
          requiredPermission: permissions[0],
          portalRole: req.portalRole,
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        error: 'You do not have permission to perform this action',
        requiredPermission: permissions[0],
      });
    }

    next();
  });
}

export default { attachEmployeePortalContext, requirePortalPermission };
