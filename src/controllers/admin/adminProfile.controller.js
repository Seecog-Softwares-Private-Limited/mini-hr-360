// src/controllers/admin/adminProfile.controller.js
import fs from 'fs';
import path from 'path';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { User, Business, UserEducation, UserExperience, UserDocument } from '../../models/index.js';
import { resolveUserDisplayRole } from '../../utils/roleLabel.util.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { sendDocumentEmail } from '../../utils/emailService.js';

const AVATAR_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const AVATAR_EXT = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
};

function deleteStoredAvatar(avatarUrl) {
    if (!avatarUrl || !avatarUrl.includes('/storage/avatars/')) return;
    const relative = avatarUrl.replace(/^\/storage\//, '');
    const filePath = path.join(process.cwd(), 'storage', relative);
    try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
        console.warn('Could not delete old avatar:', err.message);
    }
}

/**
 * GET /admin/profile - Render admin profile page
 */
export const renderProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
        attributes: { exclude: ['password', 'refreshTokens', 'refreshTokenExpiresAt'] },
        include: [
            { model: Business, as: 'businesses' }
        ]
    });

    const userJson = user.toJSON();
    userJson.displayRole = await resolveUserDisplayRole(user, req.organizationId);

    res.render('admin/profile', {
        title: 'My Profile',
        active: 'profile',
        user: userJson,
    });
});

/**
 * GET /admin/change-password - Render change password page
 */
export const renderChangePassword = (req, res) => {
    res.render('admin/change-password', {
        title: 'Change Password',
        active: 'profile',
        user: req.user
    });
};

/**
 * POST /admin/change-password - Update admin password
 */
export const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!await user.isPasswordCorrect(currentPassword)) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
});

/**
 * POST /admin/profile/avatar - Upload or update profile photo
 */
export const uploadAvatar = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    if (!AVATAR_MIMES.has(req.file.mimetype)) {
        return res.status(400).json({ success: false, message: 'Use JPG, PNG, or WEBP image' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    const dir = path.join(process.cwd(), 'storage', 'avatars');
    fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(req.file.originalname) || AVATAR_EXT[req.file.mimetype] || '.jpg';
    const safeName = `user-${user.id}-${Date.now()}${ext}`;
    fs.writeFileSync(path.join(dir, safeName), req.file.buffer);

    deleteStoredAvatar(user.avatarUrl);

    const avatarUrl = `/storage/avatars/${safeName}`;
    user.avatarUrl = avatarUrl;
    await user.save();

    return res.json({
        success: true,
        message: 'Profile photo updated',
        avatarUrl,
    });
});

/**
 * POST /admin/forgot-password - Handle forgot password request (for admins/users)
 */
export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
        return res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/reset-password/${token}`;

    await sendDocumentEmail({
        to: user.email,
        subject: 'Password Reset Request',
        html: `<p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
           <p>Please click on the following link, or paste this into your browser to complete the process:</p>
           <p><a href="${resetUrl}">${resetUrl}</a></p>
           <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`
    });

    res.json({ success: true, message: 'Reset link sent to your email.' });
});

export default {
    renderProfile,
    renderChangePassword,
    updatePassword,
    uploadAvatar,
    forgotPassword,
};
