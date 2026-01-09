// src/controllers/user/resetPassword.js
import { User } from '../../models/User.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import crypto from 'crypto';
import { Op } from 'sequelize';

/**
 * Reset Password - Validate token and update password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    throw new ApiError(400, 'Token and password are required');
  }

  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long');
  }

  // Hash the token to compare with stored hash
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with valid reset token
  const user = await User.findOne({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpires: {
        [Op.gt]: new Date() // Token not expired
      }
    }
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  // Update password (will be hashed by the beforeUpdate hook)
  user.password = password;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, null, 'Password has been reset successfully. You can now login with your new password.')
  );
});

