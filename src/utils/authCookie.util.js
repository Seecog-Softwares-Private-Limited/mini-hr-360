/**
 * Shared cookie options for auth tokens.
 * Express `maxAge` is in milliseconds.
 *
 * Cookies with `secure: true` are ignored by browsers on plain HTTP.
 * Derive from APP_URL so http://IP deployments still work.
 */

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isSecureCookieContext() {
  const appUrl = String(process.env.APP_URL || '').toLowerCase();
  if (appUrl.startsWith('https://')) return true;
  if (appUrl.startsWith('http://')) return false;
  return process.env.NODE_ENV === 'production';
}

function cookieSameSite() {
  return isSecureCookieContext() ? 'none' : 'lax';
}

export function cookieMaxAgeMs(refreshExpUnix) {
  if (refreshExpUnix) {
    const remainingMs = refreshExpUnix * 1000 - Date.now();
    return Math.max(0, remainingMs);
  }
  return SEVEN_DAYS_MS;
}

export function buildAuthCookieOptions(refreshExpUnix) {
  return {
    httpOnly: true,
    secure: isSecureCookieContext(),
    sameSite: cookieSameSite(),
    maxAge: cookieMaxAgeMs(refreshExpUnix),
    path: '/',
  };
}

export function buildClearAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: isSecureCookieContext(),
    sameSite: cookieSameSite(),
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  };
}

export function setUserAuthCookies(res, accessToken, refreshToken, refreshExpUnix) {
  const options = buildAuthCookieOptions(refreshExpUnix);
  res.cookie('accessToken', accessToken, options);
  res.cookie('refreshToken', refreshToken, options);
}

export function setEmployeeAuthCookies(res, accessToken, refreshToken, refreshExpUnix) {
  const options = buildAuthCookieOptions(refreshExpUnix);
  res.cookie('employeeAccessToken', accessToken, options);
  res.cookie('employeeRefreshToken', refreshToken, options);
}

export function clearUserAuthCookies(res) {
  const options = buildClearAuthCookieOptions();
  res.cookie('accessToken', '', options);
  res.cookie('refreshToken', '', options);
}

export function clearEmployeeAuthCookies(res) {
  const options = buildClearAuthCookieOptions();
  res.cookie('employeeAccessToken', '', options);
  res.cookie('employeeRefreshToken', '', options);
}
