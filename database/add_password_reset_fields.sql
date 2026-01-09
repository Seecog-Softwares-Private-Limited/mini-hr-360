-- Migration: Add password reset fields to users table
-- Run this SQL script to add passwordResetToken and passwordResetExpires columns

-- Check if columns exist before adding (MySQL 8.0+)
-- For older MySQL versions, remove the IF NOT EXISTS clause

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS passwordResetToken VARCHAR(255) NULL AFTER refreshTokenExpiresAt,
ADD COLUMN IF NOT EXISTS passwordResetExpires DATETIME NULL AFTER passwordResetToken;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON users(passwordResetToken);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON users(passwordResetExpires);

-- Verify the changes
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME IN ('passwordResetToken', 'passwordResetExpires');



