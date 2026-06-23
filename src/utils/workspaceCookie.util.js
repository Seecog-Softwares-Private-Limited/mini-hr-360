const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function buildWorkspaceCookieOptions() {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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
