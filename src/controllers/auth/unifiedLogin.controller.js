import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  clearEmployeeAuthCookies,
  clearUserAuthCookies,
  setEmployeeAuthCookies,
  setUserAuthCookies,
} from '../../utils/authCookie.util.js';
import { setOrganizationCookie } from '../../utils/workspaceCookie.util.js';
import {
  buildLoginSuccessPayload,
  loginErrorMessage,
  loginErrorStatus,
  resolveUnifiedLogin,
} from '../../services/authLogin.service.js';

function wantsJsonResponse(req) {
  if (req.xhr) return true;
  const accept = String(req.headers?.accept || '');
  if (accept.includes('application/json')) return true;
  const contentType = String(req.headers?.['content-type'] || '');
  return contentType.includes('application/json');
}

function applyLoginCookies(res, result) {
  if (result.accountType === 'hr') {
    setUserAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken, result.refreshExp);
    if (result.defaultOrgId) {
      setOrganizationCookie(res, result.defaultOrgId);
    }
    return;
  }

  setEmployeeAuthCookies(
    res,
    result.tokens.accessToken,
    result.tokens.refreshToken,
    result.refreshExp
  );
}

export const unifiedLogin = asyncHandler(async (req, res) => {
  const identifier = req.body.identifier || req.body.email;
  const { password } = req.body;

  if (!identifier || !password) {
    const message = 'Email/employee code and password are required';
    if (wantsJsonResponse(req)) {
      return res.status(400).json({ success: false, message });
    }
    return res.redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  clearUserAuthCookies(res);
  clearEmployeeAuthCookies(res);

  const result = await resolveUnifiedLogin(identifier, password);

  if (!result.ok) {
    const message = loginErrorMessage(result);
    const status = loginErrorStatus(result);

    if (wantsJsonResponse(req)) {
      return res.status(status).json({ success: false, message });
    }

    const errorCode =
      result.reason === 'inactive'
        ? 'inactive'
        : result.reason === 'noaccess'
          ? 'noaccess'
          : encodeURIComponent(message);
    return res.redirect(`/login?error=${errorCode}`);
  }

  applyLoginCookies(res, result);

  const payload = buildLoginSuccessPayload(result);
  const next = String(req.body.next || req.query?.next || '').trim();
  const redirectTo = next || payload.redirectTo;

  if (wantsJsonResponse(req)) {
    return res.status(200).json(
      new ApiResponse(200, { ...payload, redirectTo }, 'Login successful')
    );
  }

  return res.redirect(redirectTo);
});
