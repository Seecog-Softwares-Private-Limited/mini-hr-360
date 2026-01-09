-- Add password reset columns to users table
-- Run this SQL directly if the migration script fails

-- Check if table exists first
SELECT COUNT(*) as table_exists 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'users';

-- Add columns (only if they don't exist)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS passwordResetToken VARCHAR(255) NULL AFTER refreshTokenExpiresAt,
ADD COLUMN IF NOT EXISTS passwordResetExpires DATETIME NULL AFTER passwordResetToken;

-- Add indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON users(passwordResetToken);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON users(passwordResetExpires);

-- Verify the columns were added
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME IN ('passwordResetToken', 'passwordResetExpires');



