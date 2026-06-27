const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function isSecureCookieContext() {
  const appUrl = String(process.env.APP_URL || '').toLowerCase();
  if (appUrl.startsWith('https://')) return true;
  if (appUrl.startsWith('http://')) return false;
  return process.env.NODE_ENV === 'production';
}

function cookieSameSite() {
  return isSecureCookieContext() ? 'none' : 'lax';
}

export function buildWorkspaceCookieOptions() {
  return {
    httpOnly: false,
    secure: isSecureCookieContext(),
    sameSite: cookieSameSite(),
    maxAge: THIRTY_DAYS_MS,
    path: '/',
  };
}

export function clearWorkspaceCookie(res) {
  const options = buildWorkspaceCookieOptions();
  res.clearCookie('mh360_workspace_id', options);
  res.clearCookie('mh360_organization_id', options);
}

/** Persist active organization in cookies readable by SSR and client scripts. */
export function setOrganizationCookie(res, organizationId) {
  const id = String(organizationId);
  const options = buildWorkspaceCookieOptions();
  res.cookie('mh360_organization_id', id, options);
  res.cookie('mh360_workspace_id', id, options);
}

export function setWorkspaceCookie(res, workspaceId) {
  setOrganizationCookie(res, workspaceId);
}
