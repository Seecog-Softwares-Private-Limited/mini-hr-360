/**
 * Shared cookie options for auth tokens.
 * Express `maxAge` is in milliseconds.
 */

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: cookieMaxAgeMs(refreshExpUnix),
    path: '/',
  };
}

export function buildClearAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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
