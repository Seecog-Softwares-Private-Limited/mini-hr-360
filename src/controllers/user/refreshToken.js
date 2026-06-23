import { rotateUserSession } from "../../services/userSession.service.js";
import { setUserAuthCookies } from "../../utils/authCookie.util.js";
import { User } from "../../models/User.js";

export const refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken || req.header("x-refresh-token")?.trim();
        if (!refreshToken) return res.status(400).json({ message: "refreshToken required" });

        const { accessToken, refreshToken: newRefresh, refreshExp, user } = await rotateUserSession(refreshToken);

        setUserAuthCookies(res, accessToken, newRefresh, refreshExp);

        const safeUser = await User.findByPk(user.id, {
            attributes: { exclude: ['password', 'refreshTokens'] },
        });

        return res.status(200).json({
            message: "Token refreshed",
            tokens: { accessToken, refreshToken: newRefresh },
            user: safeUser,
        });
    } catch (e) {
        if (e.code) {
            return res.status(401).json({ message: e.message });
        }
        console.error("refresh error", e);
        return res.status(500).json({ message: "internal_error" });
    }
};
