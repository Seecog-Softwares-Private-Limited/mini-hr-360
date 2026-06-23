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

export function setWorkspaceCookie(res, workspaceId) {
  res.cookie('mh360_workspace_id', String(workspaceId), buildWorkspaceCookieOptions());
}

export function clearWorkspaceCookie(res) {
  res.clearCookie('mh360_workspace_id', buildWorkspaceCookieOptions());
}
