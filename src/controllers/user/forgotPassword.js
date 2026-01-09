// src/controllers/user/forgotPassword.js
import { User } from '../../models/User.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import crypto from 'crypto';
import { sendDocumentEmail } from '../../utils/emailService.js';
import { APP_URL } from '../../config/app.config.js';

/**
 * Forgot Password - Send reset link to email
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  try {
    // First, check if the users table exists by trying a simple query
    let user;
    try {
      // Find user by email
      user = await User.findOne({ where: { email } });
    } catch (dbError) {
      console.error('❌ Database query error:', dbError.name);
      console.error('Error message:', dbError.message);
      console.error('Original error:', dbError.original?.message);
      console.error('Error code:', dbError.original?.code);
      
      // Handle case where table doesn't exist or columns are missing
      if (dbError.name === 'SequelizeDatabaseError' || 
          dbError.original?.code === 'ER_NO_SUCH_TABLE' ||
          dbError.message?.includes("doesn't exist") ||
          dbError.original?.message?.includes("doesn't exist") ||
          dbError.original?.code === 'ER_BAD_FIELD_ERROR') {
        console.error('❌ Database table "users" does not exist or is missing columns.');
        console.error('💡 Current config:');
        console.error(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
        console.error(`   SYNC_DB: ${process.env.SYNC_DB || 'not set'}`);
        console.error('💡 Solution:');
        console.error('   1. Ensure SYNC_DB=true in property.env');
        console.error('   2. Restart the server: npm run dev');
        console.error('   3. Check server logs for "Schema synced" message');
        console.error('   4. Or run: npm run seed-db');
        throw new ApiError(500, 'Database not initialized. Please restart server with SYNC_DB=true to create tables, or contact administrator.');
      }
      
      // Handle missing columns error
      if (dbError.original?.code === 'ER_BAD_FIELD_ERROR' ||
          dbError.message?.includes('passwordResetToken') ||
          dbError.original?.message?.includes('passwordResetToken') ||
          dbError.original?.message?.includes('Unknown column')) {
        console.error('⚠️ Password reset columns missing. Run migration: npm run migrate-password-reset-sequelize');
        throw new ApiError(500, 'Database migration required. Please run: npm run migrate-password-reset-sequelize');
      }
      
      // Re-throw other errors
      throw dbError;
    }

    // Always return success message for security (don't reveal if email exists)
    // But only send email if user exists
    if (user) {
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set token and expiry (1 hour from now)
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Create reset URL
    const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

    // Send email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%); color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096; }
          .warning { background: #fff5f5; border-left: 4px solid #e53e3e; padding: 12px; margin: 20px 0; color: #742a2a; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
            <p style="margin: 0;">mini HR 360</p>
          </div>
          <div class="content">
            <p>Hello ${user.firstName || 'User'},</p>
            <p>We received a request to reset your password for your mini HR 360 account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4299e1;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
            </div>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from mini HR 360. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} mini HR 360. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await sendDocumentEmail({
        to: user.email,
        subject: 'Password Reset Request - mini HR 360',
        html: emailHtml,
      });
      console.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      // Don't throw error - still return success for security
    }
  }

    // Always return success message (security best practice)
    return res.status(200).json(
      new ApiResponse(200, null, 'If an account with that email exists, a password reset link has been sent.')
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error original:', error.original?.message);
    
    // Check if it's a database column error (migration not run)
    if (error.name === 'SequelizeDatabaseError' || 
        (error.original && error.original.code === 'ER_BAD_FIELD_ERROR') ||
        error.message?.includes('passwordResetToken') ||
        error.message?.includes("Unknown column") ||
        error.original?.message?.includes('passwordResetToken') ||
        error.original?.message?.includes("Unknown column")) {
      console.error('⚠️ Database migration required! Run: npm run migrate-password-reset');
      throw new ApiError(500, 'Database migration required. The password reset feature needs database columns to be added. Please run: npm run migrate-password-reset');
    }
    
    // Re-throw to be handled by error middleware
    throw error;
  }
});

