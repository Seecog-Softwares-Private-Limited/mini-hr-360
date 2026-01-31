import { User } from "../../models/User.js";
import { OTP } from "../../models/OTP.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildTokenPair, hashToken } from "../../utils/token.util.js";
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';

export const verifyOTP = asyncHandler(async (req, res) => {
    try {
        const { identifier, otp, type } = req.body;

        if (!identifier || !otp || !type) {
            return res.status(400).json(new ApiResponse(400, null, "Identifier, OTP and type are required"));
        }

        const otpEntry = await OTP.findOne({
            where: {
                identifier,
                type,
                expiresAt: { [Op.gt]: new Date() }
            },
            order: [['createdAt', 'DESC']]
        });

        if (!otpEntry) {
            return res.status(400).json(new ApiResponse(400, null, "Invalid or expired OTP"));
        }

        const isOtpValid = await bcrypt.compare(otp, otpEntry.otp);
        if (!isOtpValid) {
            return res.status(400).json(new ApiResponse(400, null, "Invalid or expired OTP"));
        }

        let user;
        if (type === 'login') {
            user = await User.findOne({ where: { email: identifier } });
            if (!user) {
                return res.status(404).json(new ApiResponse(404, null, "User not found"));
            }
        } else if (type === 'register') {
            const registrationData = JSON.parse(otpEntry.metadata);

            // Double check if user was created while OTP was pending
            const exists = await User.findOne({ where: { email: registrationData.email } });
            if (exists) {
                user = exists;
            } else {
                user = await User.create({
                    avatarUrl: null,
                    firstName: registrationData.firstName,
                    lastName: registrationData.lastName,
                    phoneNo: registrationData.phoneNo,
                    email: registrationData.email,
                    password: registrationData.password
                });
            }
        }

        // Generate tokens
        const { accessToken, refreshToken, accessExp, refreshExp } = buildTokenPair(user.id);

        user.refreshTokens = hashToken(refreshToken);
        user.refreshTokenExpiresAt = refreshExp ? new Date(refreshExp * 1000) : null;
        await user.save();

        // Delete the used OTP
        await otpEntry.destroy();

        let maxAgeSeconds;
        if (refreshExp) {
            const remainingMs = (refreshExp * 1000) - Date.now();
            maxAgeSeconds = Math.max(0, Math.floor(remainingMs / 1000));
        } else {
            maxAgeSeconds = 7 * 24 * 60 * 60;
        }

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: maxAgeSeconds,
            path: "/"
        };

        const userData = await User.findByPk(user.id, {
            attributes: { exclude: ['password'] }
        });

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(new ApiResponse(200, { tokens: { accessToken, refreshToken }, user: userData }, "Authentication successful"));

    } catch (err) {
        console.error("OTP Verification Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});
