// src/controllers/employee/employeeProfile.controller.js
import fs from 'fs';
import path from 'path';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Employee, EmployeeEducation, EmployeeExperience, EmployeeDocument, Business, User } from '../../models/index.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { sendDocumentEmail } from '../../utils/emailService.js';
import {
  getEmployeeDashboardOverview,
  parseSkills,
  buildCareerJourney,
  getCertificates,
} from '../../services/employeeDashboard.service.js';
import { getEmployeePortalLifecycleSummary } from '../../services/employeePortalLifecycle.service.js';

const HR_DEFAULT_PASSWORD_PREFIX = 'hr_default_pwd:';

const PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PHOTO_EXT = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
};

function deleteStoredProfilePhoto(photoUrl) {
    if (!photoUrl || !String(photoUrl).includes('/storage/')) return;
    const relative = String(photoUrl).replace(/^\/storage\//, '').replace(/^storage\//, '');
    const filePath = path.join(process.cwd(), 'storage', relative);
    try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
        console.warn('Could not delete old profile photo:', err.message);
    }
}

function clearHrVisibleDefaultPassword(employee) {
    if (!employee) return;
    if (String(employee.resetPasswordToken || '').startsWith(HR_DEFAULT_PASSWORD_PREFIX)) {
        employee.resetPasswordToken = null;
        employee.resetPasswordExpires = null;
    }
    employee.forcePasswordReset = false;
    employee.lastPasswordResetAt = new Date();
}

/**
 * GET /employee/profile - Render profile page
 */
export const renderProfile = asyncHandler(async (req, res) => {
    const employeeId = req.employee.id;

    const employee = await Employee.findByPk(employeeId, {
        attributes: { exclude: ['password', 'employeeRefreshToken', 'employeeRefreshTokenExpiresAt'] },
        include: [
            { model: Business, as: 'business' },
            { model: EmployeeEducation, as: 'educations' },
            { model: EmployeeExperience, as: 'experiences' },
            { model: EmployeeDocument, as: 'documents' }
        ]
    });

    const employeeJson = employee.toJSON();
    const overview = await getEmployeeDashboardOverview(employee);
    const lifecycle = await getEmployeePortalLifecycleSummary(employee);

    res.render('employee/profile', {
        title: 'My Profile',
        layout: 'employee-main',
        active: 'profile',
        employee: employeeJson,
        lifecycle,
        skills: parseSkills(employeeJson),
        careerJourney: buildCareerJourney(employeeJson, employeeJson.experiences || []),
        certificates: getCertificates(employeeJson.documents || []),
        reputation: overview.reputation,
    });
});

/**
 * GET /employee/change-password - Render change password page
 */
export const renderChangePassword = (req, res) => {
    res.render('employee/change-password', {
        title: 'Change Password',
        layout: 'employee-main',
        active: 'profile',
        employee: req.employee
    });
};

/**
 * POST /employee/change-password - Update password
 */
export const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const employee = await Employee.findByPk(req.employee.id);

    if (!await employee.isPasswordCorrect(currentPassword)) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    employee.password = newPassword;
    clearHrVisibleDefaultPassword(employee);
    await employee.save();

    res.json({ success: true, message: 'Password updated successfully' });
});

/**
 * POST /employee/profile/photo - Upload or update employee profile photo
 */
export const uploadProfilePhoto = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    if (!PHOTO_MIMES.has(req.file.mimetype)) {
        return res.status(400).json({ success: false, message: 'Use JPG, PNG, or WEBP image' });
    }

    const employee = await Employee.findByPk(req.employee.id);
    if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const dir = path.join(process.cwd(), 'storage', 'employee-avatars');
    fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(req.file.originalname) || PHOTO_EXT[req.file.mimetype] || '.jpg';
    const safeName = `emp-${employee.id}-${Date.now()}${ext}`;
    fs.writeFileSync(path.join(dir, safeName), req.file.buffer);

    deleteStoredProfilePhoto(employee.profilePhoto);

    const profilePhoto = `/storage/employee-avatars/${safeName}`;
    employee.profilePhoto = profilePhoto;
    await employee.save();

    const email = String(employee.empEmail || '').trim().toLowerCase();
    if (email) {
        const user = await User.findOne({ where: { email } });
        if (user) {
            deleteStoredProfilePhoto(user.avatarUrl);
            user.avatarUrl = profilePhoto;
            await user.save();
        }
    }

    req.employee.profilePhoto = profilePhoto;

    return res.json({
        success: true,
        message: 'Profile photo updated',
        profilePhoto,
    });
});

/**
 * POST /employee/forgot-password - Handle forgot password request
 */
export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const employee = await Employee.findOne({ where: { empEmail: email.toLowerCase() } });

    if (!employee) {
        // Return success to avoid email enumation
        return res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    employee.resetPasswordToken = token;
    employee.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await employee.save();

    const resetUrl = `${req.protocol}://${req.get('host')}/employee/reset-password/${token}`;

    await sendDocumentEmail({
        to: employee.empEmail,
        subject: 'Password Reset Request',
        html: `<p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
           <p>Please click on the following link, or paste this into your browser to complete the process:</p>
           <p><a href="${resetUrl}">${resetUrl}</a></p>
           <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`
    });

    res.json({ success: true, message: 'Reset link sent to your email.' });
});

/**
 * GET /employee/reset-password/:token - Render reset password page
 */
export const renderResetPassword = asyncHandler(async (req, res) => {
    const employee = await Employee.findOne({
        where: {
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { [Op.gt]: Date.now() }
        }
    });

    if (!employee) {
        return res.redirect('/login?error=' + encodeURIComponent('Password reset token is invalid or has expired.'));
    }

    res.render('employee/reset-password', {
        title: 'Reset Password',
        layout: 'employee-main',
        pageClass: 'auth',
        token: req.params.token
    });
});

/**
 * POST /employee/reset-password/:token - Perform reset password
 */
export const resetPassword = asyncHandler(async (req, res) => {
    const employee = await Employee.findOne({
        where: {
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { [Op.gt]: Date.now() }
        }
    });

    if (!employee) {
        return res.status(400).json({ success: false, message: 'Password reset token is invalid or has expired.' });
    }

    const { password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    employee.password = password;
    clearHrVisibleDefaultPassword(employee);
    employee.resetPasswordToken = null;
    employee.resetPasswordExpires = null;
    await employee.save();

    res.json({ success: true, message: 'Password has been reset. You can now login.' });
});

export default {
    renderProfile,
    renderChangePassword,
    updatePassword,
    uploadProfilePhoto,
    forgotPassword,
    renderResetPassword,
    resetPassword,
};
