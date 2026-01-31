import { User } from "../../models/User.js";
import { OTP } from "../../models/OTP.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildTokenPair, hashToken } from "../../utils/token.util.js";
import { sendDocumentEmail } from "../../utils/emailService.js";
import bcrypt from 'bcrypt';
import { sendSMS } from "../../../smsService.js";

export const loginUser = asyncHandler(async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const isValid = await user.isPasswordCorrect(password);
        if (!isValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // MFA Step: Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = await bcrypt.hash(otp, 10);
        const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Store OTP
        await OTP.create({
            identifier: email,
            otp: hashedOtp,
            expiresAt: expiry,
            type: 'login'
        });

        // Send OTP via Email
        await sendDocumentEmail({
            to: email,
            subject: "Your Login OTP",
            html: `<p>Your login OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`
        });

        // Send OTP via SMS if phone exists
        if (user.phoneNo) {
            try {
                await sendSMS(
                    user.phoneNo,
                    `Your OTP is ${otp}. It expires in 5 minutes.`
                );
            } catch (smsError) {
                console.error("Failed to send SMS OTP:", smsError);
            }
        }

        return res.status(200).json(new ApiResponse(200, { mfaRequired: true, identifier: email }, "OTP sent to your email and phone"));

        /* Original logic removed for MFA flow
        const { accessToken, refreshToken, accessExp, refreshExp } = buildTokenPair(
            user.id
        );
        ...
        */

    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
})

export const logoutUser = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(401).json({ message: "Invalid user" });
        }

        // Clear refresh tokens and expiry
        user.refreshTokens = null;
        user.refreshTokenExpiresAt = null;
        await user.save();

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            path: "/", // Must match the path used when setting cookies
            expires: new Date(0), // Expire the cookie immediately
            maxAge: 0 // Also set maxAge to 0 to ensure immediate expiration
        };

        return res
            .status(200)
            .cookie("accessToken", "", options)
            .cookie("refreshToken", "", options)
            .json(new ApiResponse(200, null, "Logout Successful"));
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});