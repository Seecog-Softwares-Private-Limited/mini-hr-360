import { asyncHandler } from "../utils/asyncHandler.js"

import { User } from "../models/User.js"
import { verifyAccessToken } from "../utils/token.util.js"
import { rotateUserSession } from "../services/userSession.service.js"
import { clearUserAuthCookies, setUserAuthCookies } from "../utils/authCookie.util.js"
import { ensureOrganizationContext } from "../services/organization.service.js"
import { resolveUserDisplayRole } from "../utils/roleLabel.util.js"

function shouldRedirectToLogin(req) {
    // Only redirect for real browser page navigations to HTML pages.
    // Fetch/XHR often sends Accept: */* which previously caused unwanted redirects.
    const accept = String(req.headers?.accept || "");
    const wantsHtml = accept.includes("text/html");
    const isApiPath =
        String(req.originalUrl || "").startsWith("/api/") ||
        String(req.originalUrl || "").startsWith("/api/v1/");
    const isGet = req.method === "GET";
    const isXHR = req.xhr || String(req.headers?.["x-requested-with"] || "").toLowerCase() === "xmlhttprequest";

    return isGet && wantsHtml && !isApiPath && !isXHR;
}

function isExpiredTokenError(error) {
    return error?.name === "TokenExpiredError" || String(error?.message || "").includes("jwt expired");
}

async function tryRefreshUserSession(req, res) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return null;

    try {
        const { accessToken, refreshToken: newRefresh, refreshExp, user } = await rotateUserSession(refreshToken);
        setUserAuthCookies(res, accessToken, newRefresh, refreshExp);
        return user;
    } catch {
        clearUserAuthCookies(res);
        return null;
    }
}

async function authenticateUser(req, res) {
    const token = req.cookies?.accessToken || req.header
        ("Authorization")?.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
        return { error: "missing_token" };
    }

    try {
        const decoded = verifyAccessToken(token);
        const user = await User.findByPk(decoded?.sub, {
            attributes: { exclude: ['password', 'refreshTokens'] }
        });

        if (!user) {
            return { error: "invalid_user" };
        }

        return { user };
    } catch (error) {
        if (!isExpiredTokenError(error)) {
            return { error: "invalid_token", message: error.message };
        }

        const user = await tryRefreshUserSession(req, res);
        if (!user) {
            return { error: "session_expired", message: error.message };
        }

        return { user };
    }
}

export const verifyUser = asyncHandler(async (req, res, next) => {
    const auth = await authenticateUser(req, res);

    if (auth.user) {
        req.user = auth.user;
        await ensureOrganizationContext(req, res);
        req.userDisplayRole = await resolveUserDisplayRole(auth.user, req.organizationId);
        res.locals.userDisplayRole = req.userDisplayRole;
        return next();
    }

    if (shouldRedirectToLogin(req)) {
        clearUserAuthCookies(res);
        return res.redirect('/login');
    }

    return res.status(401).json({
        success: false,
        message: 'Authentication failed',
        error: auth.message || 'Unauthorized request',
    });
})

export const verifyOwner = asyncHandler(async (req, res, next) => {
    const auth = await authenticateUser(req, res);

    if (!auth.user) {
        if (shouldRedirectToLogin(req)) {
            clearUserAuthCookies(res);
            return res.redirect('/login');
        }

        return res.status(401).json({
            success: false,
            message: 'Authentication failed',
            error: auth.message || 'Unauthorized request',
        });
    }

    const owner = auth.user;
    const role = String(owner.role || '').toLowerCase();
    const isAdminRole = role.includes('admin');
    if (role !== 'shop_owner' && !isAdminRole) {
        if (shouldRedirectToLogin(req)) return res.redirect('/login');
        return res.status(403).json({
            success: false,
            message: 'Access denied',
            error: 'only shop owner or admin roles can access',
        });
    }

    req.owner = owner;
    next();
});
