import { asyncHandler } from "../../utils/asyncHandler.js"
import { ApiError } from "../../utils/ApiError.js"
import { ApiResponse } from "../../utils/ApiResponse.js"
import { User } from '../../models/User.js';
import { OTP } from "../../models/OTP.js";
import { buildTokenPair, hashToken } from '../../utils/token.util.js';
import { sendDocumentEmail } from "../../utils/emailService.js";
import bcrypt from 'bcrypt';
import { sendSMS } from "../../../smsService.js";

export default async function register(req, res) {
    try {
        const { firstName, lastName, phoneNo, email, password } = req.body || {};
        const normalizedEmail = String(email || '').trim().toLowerCase();
        if (!firstName || !lastName || !phoneNo || !email || !password) {
            return res
                .status(400)
                .json(new ApiResponse(400, null, 'firstName, lastName, phoneNo, email and password required'));
        }

        console.log('registering user', normalizedEmail);

        const exists = await User.findOne({ where: { email: normalizedEmail } });
        if (exists) {
            return res.status(409).json(new ApiResponse(409, null, 'User already exists'));
        }

        // MFA Step: Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = await bcrypt.hash(otp, 10);
        const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Store Registration data + OTP in metadata
        await OTP.create({
            identifier: normalizedEmail,
            otp: hashedOtp,
            expiresAt: expiry,
            type: 'register',
            metadata: JSON.stringify({
                firstName,
                lastName,
                phoneNo: '+91' + phoneNo.replace('+91', ''),
                email: normalizedEmail,
                password // User.js will hash it on creation
            })
        });

        // Send OTP via Email
        await sendDocumentEmail({
            to: normalizedEmail,
            subject: "Your Registration OTP",
            html: `<p>Thank you for registering. Your OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`
        });

        // Send OTP via SMS
        try {
            await sendSMS(
                phoneNo.startsWith('+91') ? phoneNo : '+91' + phoneNo,
                `Your registration OTP is ${otp}. It expires in 5 minutes.`
            );
        } catch (smsError) {
            console.error("Failed to send SMS OTP:", smsError);
        }

        return res.status(200).json(new ApiResponse(200, { mfaRequired: true, identifier: normalizedEmail }, "OTP sent to your email and phone"));

        /* Original logic removed for MFA flow
        const user = await User.create({
            avatarUrl: null,
            firstName, 
            lastName,
            phoneNo,
            email: normalizedEmail,
            password,
        });
        ...
        */
    } catch (e) {
        console.error('register error', e);
        // Race condition safety: if two requests register same email concurrently,
        // DB unique constraint is the source of truth.
        if (e && (e.name === 'SequelizeUniqueConstraintError' || e.name === 'SequelizeValidationError')) {
            const msg =
                e.name === 'SequelizeUniqueConstraintError'
                    ? 'User already exists'
                    : 'Invalid user data';
            return res.status(409).json(new ApiResponse(409, null, msg));
        }
        return res.status(500).json(new ApiResponse(500, null, 'internal_error'));
    }
}