// src/controllers/employee/employeeProfile.controller.js
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Employee, EmployeeEducation, EmployeeExperience, EmployeeDocument, Business } from '../../models/index.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { sendDocumentEmail } from '../../utils/emailService.js';

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

    res.render('employee/profile', {
        title: 'My Profile',
        layout: 'employee-main',
        active: 'profile',
        employee: employee.toJSON(),
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
    await employee.save();

    res.json({ success: true, message: 'Password updated successfully' });
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
        return res.render('employee/login', {
            error: 'Password reset token is invalid or has expired.',
            layout: 'employee-main',
            pageClass: 'auth'
        });
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
    employee.resetPasswordToken = null;
    employee.resetPasswordExpires = null;
    await employee.save();

    res.json({ success: true, message: 'Password has been reset. You can now login.' });
});

// ==========================================================
// EMPLOYEE SELF-SERVICE PROFILE EDIT APIs (NO PROFESSIONAL/CTC)
// ==========================================================

/**
 * PUT /employee/api/profile/personal
 * Update only personal/contact/address fields (NOT professional/compensation)
 */
export const updatePersonalProfile = asyncHandler(async (req, res) => {
  const employeeId = req.employee.id;
  const employee = await Employee.findByPk(employeeId);

  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  // Whitelist: personal + contact + address + emergency only
  const allowed = [
    'empDob',
    'gender',
    'maritalStatus',
    'bloodGroup',
    'nationality',
    'religion',
    'casteCategory',
    'languagesKnown',
    'empPhone',
    'altPhone',
    'empEmail',
    'emergencyContactName',
    'emergencyContactRelation',
    'emergencyContactNumber',
    'presentAddressLine1',
    'presentAddressLine2',
    'presentCity',
    'presentState',
    'presentZip',
    'presentCountry',
    'permanentSameAsPresent',
    'permanentAddressLine1',
    'permanentAddressLine2',
    'permanentCity',
    'permanentState',
    'permanentZip',
    'permanentCountry',
  ];

  for (const key of allowed) {
    if (typeof req.body?.[key] !== 'undefined') {
      employee[key] = req.body[key];
    }
  }

  // Normalize
  if (typeof employee.empEmail === 'string') employee.empEmail = employee.empEmail.toLowerCase().trim();
  if (typeof employee.empPhone === 'string') employee.empPhone = employee.empPhone.replace(/\D/g, '').slice(0, 10);
  if (typeof employee.altPhone === 'string') employee.altPhone = employee.altPhone.replace(/\D/g, '').slice(0, 10);
  if (typeof employee.emergencyContactNumber === 'string') {
    employee.emergencyContactNumber = employee.emergencyContactNumber.replace(/\D/g, '').slice(0, 10);
  }

  // If employee wants permanent same as present, copy values
  if (employee.permanentSameAsPresent) {
    employee.permanentAddressLine1 = employee.presentAddressLine1;
    employee.permanentAddressLine2 = employee.presentAddressLine2;
    employee.permanentCity = employee.presentCity;
    employee.permanentState = employee.presentState;
    employee.permanentZip = employee.presentZip;
    employee.permanentCountry = employee.presentCountry;
  }

  await employee.save();

  return res.json({
    success: true,
    message: 'Personal details updated successfully',
    data: {
      empDob: employee.empDob,
      gender: employee.gender,
      empEmail: employee.empEmail,
      empPhone: employee.empPhone,
      permanentAddressLine1: employee.permanentAddressLine1,
      permanentCity: employee.permanentCity,
      permanentState: employee.permanentState,
      permanentZip: employee.permanentZip,
    },
  });
});

/**
 * POST /employee/api/profile/educations
 */
export const createEducation = asyncHandler(async (req, res) => {
  const employeeId = req.employee.id;

  const payload = {
    employeeId,
    level: req.body?.level,
    degree: req.body?.degree ?? null,
    specialization: req.body?.specialization ?? null,
    institutionName: req.body?.institutionName ?? null,
    board: req.body?.board ?? null,
    startYear: req.body?.startYear ?? null,
    endYear: req.body?.endYear ?? null,
    yearOfPassing: req.body?.yearOfPassing ?? null,
    percentageOrCgpa: req.body?.percentageOrCgpa ?? null,
    modeOfStudy: req.body?.modeOfStudy ?? null,
    educationType: req.body?.educationType ?? null,
    country: req.body?.country ?? null,
    city: req.body?.city ?? null,
    certificateUrl: req.body?.certificateUrl ?? null,
  };

  if (!payload.level) {
    return res.status(400).json({ success: false, message: 'level is required' });
  }

  const created = await EmployeeEducation.create(payload);
  return res.status(201).json({ success: true, message: 'Education added', data: created });
});

/**
 * PUT /employee/api/profile/educations/:id
 */
export const updateEducation = asyncHandler(async (req, res) => {
  const employeeId = req.employee.id;
  const id = Number(req.params.id);

  const education = await EmployeeEducation.findOne({ where: { id, employeeId } });
  if (!education) {
    return res.status(404).json({ success: false, message: 'Education record not found' });
  }

  const allowed = [
    'level',
    'degree',
    'specialization',
    'institutionName',
    'board',
    'startYear',
    'endYear',
    'yearOfPassing',
    'percentageOrCgpa',
    'modeOfStudy',
    'educationType',
    'country',
    'city',
    'certificateUrl',
  ];

  for (const key of allowed) {
    if (typeof req.body?.[key] !== 'undefined') education[key] = req.body[key];
  }

  await education.save();
  return res.json({ success: true, message: 'Education updated', data: education });
});

/**
 * DELETE /employee/api/profile/educations/:id
 */
export const deleteEducation = asyncHandler(async (req, res) => {
  const employeeId = req.employee.id;
  const id = Number(req.params.id);

  const education = await EmployeeEducation.findOne({ where: { id, employeeId } });
  if (!education) return res.status(404).json({ success: false, message: 'Education record not found' });

  await education.destroy();
  return res.json({ success: true, message: 'Education deleted' });
});

/**
 * POST /employee/api/profile/experiences
 */
export const createExperience = asyncHandler(async (req, res) => {
  const employeeId = req.employee.id;

  const payload = {
    employeeId,
    organizationName: req.body?.organizationName,
    jobTitle: req.body?.jobTitle,
    employmentType: req.body?.employmentType ?? null,
    department: req.body?.department ?? null,
    industryType: req.body?.industryType ?? null,
    companyLocationCity: req.body?.companyLocationCity ?? null,
    companyLocationCountry: req.body?.companyLocationCountry ?? null,
    startDate: req.body?.startDate ?? null,
    endDate: req.body?.endDate ?? null,
    isCurrent: Boolean(req.body?.isCurrent),
    durationText: req.body?.durationText ?? null,
    jobLevel: req.body?.jobLevel ?? null,
    lastDrawnCtc: req.body?.lastDrawnCtc ?? null,
    reasonForLeaving: req.body?.reasonForLeaving ?? null,
    noticePeriodServed: Boolean(req.body?.noticePeriodServed),
    relievingLetterUrl: req.body?.relievingLetterUrl ?? null,
    salarySlipsUrl: req.body?.salarySlipsUrl ?? null,
    bankStatementUrl: req.body?.bankStatementUrl ?? null,
  };

  if (!payload.organizationName || !payload.jobTitle) {
    return res.status(400).json({ success: false, message: 'organizationName and jobTitle are required' });
  }

  if (payload.isCurrent) payload.endDate = null;

  const created = await EmployeeExperience.create(payload);
  return res.status(201).json({ success: true, message: 'Experience added', data: created });
});

/**
 * PUT /employee/api/profile/experiences/:id
 */
export const updateExperience = asyncHandler(async (req, res) => {
  const employeeId = req.employee.id;
  const id = Number(req.params.id);

  const exp = await EmployeeExperience.findOne({ where: { id, employeeId } });
  if (!exp) return res.status(404).json({ success: false, message: 'Experience record not found' });

  const allowed = [
    'organizationName',
    'jobTitle',
    'employmentType',
    'department',
    'industryType',
    'companyLocationCity',
    'companyLocationCountry',
    'startDate',
    'endDate',
    'isCurrent',
    'durationText',
    'jobLevel',
    'lastDrawnCtc',
    'reasonForLeaving',
    'noticePeriodServed',
    'relievingLetterUrl',
    'salarySlipsUrl',
    'bankStatementUrl',
  ];

  for (const key of allowed) {
    if (typeof req.body?.[key] !== 'undefined') exp[key] = req.body[key];
  }

  if (exp.isCurrent) exp.endDate = null;

  await exp.save();
  return res.json({ success: true, message: 'Experience updated', data: exp });
});

/**
 * DELETE /employee/api/profile/experiences/:id
 */
export const deleteExperience = asyncHandler(async (req, res) => {
  const employeeId = req.employee.id;
  const id = Number(req.params.id);

  const exp = await EmployeeExperience.findOne({ where: { id, employeeId } });
  if (!exp) return res.status(404).json({ success: false, message: 'Experience record not found' });

  await exp.destroy();
  return res.json({ success: true, message: 'Experience deleted' });
});

/**
 * POST /employee/api/profile/documents
 */
export const createEmployeeDocument = asyncHandler(async (req, res) => {
  const employeeId = req.employee.id;

  const payload = {
    employeeId,
    category: req.body?.category ?? 'KYC',
    documentType: req.body?.documentType,
    nameOnDocument: req.body?.nameOnDocument ?? null,
    documentNumber: req.body?.documentNumber ?? null,
    issueDate: req.body?.issueDate ?? null,
    expiryDate: req.body?.expiryDate ?? null,
    fileUrl: req.body?.fileUrl ?? null,
    documentImageUrl: req.body?.documentImageUrl ?? null,
    notes: req.body?.notes ?? null,
    verificationStatus: 'Pending',
    verifiedBy: null,
    verifiedAt: null,
  };

  if (!payload.documentType) {
    return res.status(400).json({ success: false, message: 'documentType is required' });
  }

  const created = await EmployeeDocument.create(payload);
  return res.status(201).json({ success: true, message: 'Document added', data: created });
});

/**
 * PUT /employee/api/profile/documents/:id
 * Any change resets verification back to Pending so Admin can re-verify.
 */
export const updateEmployeeDocument = asyncHandler(async (req, res) => {
  const employeeId = req.employee.id;
  const id = Number(req.params.id);

  const doc = await EmployeeDocument.findOne({ where: { id, employeeId } });
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

  const allowed = [
    'category',
    'documentType',
    'nameOnDocument',
    'documentNumber',
    'issueDate',
    'expiryDate',
    'fileUrl',
    'documentImageUrl',
    'notes',
  ];

  for (const key of allowed) {
    if (typeof req.body?.[key] !== 'undefined') doc[key] = req.body[key];
  }

  // Reset verification so Admin sees that employee changed KYC
  doc.verificationStatus = 'Pending';
  doc.verifiedBy = null;
  doc.verifiedAt = null;

  await doc.save();
  return res.json({ success: true, message: 'Document updated', data: doc });
});

/**
 * DELETE /employee/api/profile/documents/:id
 */
export const deleteEmployeeDocument = asyncHandler(async (req, res) => {
  const employeeId = req.employee.id;
  const id = Number(req.params.id);

  const doc = await EmployeeDocument.findOne({ where: { id, employeeId } });
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

  await doc.destroy();
  return res.json({ success: true, message: 'Document deleted' });
});


export default {
    renderProfile,
    renderChangePassword,
    updatePassword,
    forgotPassword,
    renderResetPassword,
    resetPassword,
    updatePersonalProfile,
  createEducation,
  updateEducation,
  deleteEducation,
  createExperience,
  updateExperience,
  deleteExperience,
  createEmployeeDocument,
  updateEmployeeDocument,
  deleteEmployeeDocument,
};
