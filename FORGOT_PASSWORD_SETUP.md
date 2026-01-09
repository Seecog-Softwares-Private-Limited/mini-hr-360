# Forgot Password Feature Setup

This document explains the forgot password feature implementation and how to set it up.

## Overview

The forgot password feature allows users to reset their password via email. When a user requests a password reset:
1. A secure token is generated and stored in the database
2. An email with a reset link is sent to the user's email address
3. The user clicks the link and is taken to a reset password page
4. After entering a new password, the token is validated and the password is updated

## Database Changes

Two new fields have been added to the `users` table:
- `passwordResetToken` (VARCHAR 255): Stores the hashed reset token
- `passwordResetExpires` (DATETIME): Stores the expiration time (1 hour from request)

## Migration Steps

### Option 1: Using the Migration Script (Recommended)

Run the migration script to automatically add the required fields:

```bash
npm run migrate-password-reset
```

### Option 2: Manual SQL Migration

If you prefer to run SQL manually, execute the SQL file:

```bash
mysql -u [username] -p [database_name] < database/add_password_reset_fields.sql
```

Or connect to your MySQL database and run:

```sql
ALTER TABLE users 
ADD COLUMN passwordResetToken VARCHAR(255) NULL AFTER refreshTokenExpiresAt,
ADD COLUMN passwordResetExpires DATETIME NULL AFTER passwordResetToken;

CREATE INDEX idx_password_reset_token ON users(passwordResetToken);
CREATE INDEX idx_password_reset_expires ON users(passwordResetExpires);
```

## Environment Variables

Make sure these environment variables are set in `property.env`:

- `APP_URL`: The base URL of your application (used in reset email links)
  - Example: `APP_URL=http://localhost:3002` (for development)
  - Example: `APP_URL=https://yourdomain.com` (for production)

- Email configuration (already configured):
  - `SMTP_HOST`: SMTP server host
  - `SMTP_PORT`: SMTP server port
  - `SMTP_USER`: SMTP username
  - `SMTP_PASS`: SMTP password
  - `SMTP_FROM`: Email sender address

## API Endpoints

### POST `/users/forgot-password`
Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "If an account with that email exists, a password reset link has been sent.",
  "data": null
}
```

### POST `/users/reset-password`
Reset password using token.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "newpassword123"
}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Password has been reset successfully. You can now login with your new password.",
  "data": null
}
```

## Frontend Pages

### `/forgot-password`
- Form to enter email address
- Sends reset request to backend
- Shows success message (always shows success for security)

### `/reset-password?token=...`
- Form to enter new password
- Validates token from URL
- Updates password on successful submission
- Redirects to login page after success

## Security Features

1. **Token Hashing**: Reset tokens are hashed using SHA-256 before storing in database
2. **Token Expiration**: Tokens expire after 1 hour
3. **One-Time Use**: Tokens are cleared after successful password reset
4. **Email Privacy**: Always returns success message even if email doesn't exist (prevents email enumeration)
5. **Password Validation**: Minimum 6 characters required

## Testing

1. **Request Password Reset:**
   - Go to `/login`
   - Click "Forgot Password?"
   - Enter a valid email address
   - Check email inbox for reset link

2. **Reset Password:**
   - Click the reset link in the email
   - Enter new password (min 6 characters)
   - Confirm password
   - Submit form
   - Should redirect to login page

3. **Test Invalid Token:**
   - Try accessing `/reset-password?token=invalid-token`
   - Should show error message

## Troubleshooting

### Email Not Sending
- Check SMTP configuration in `property.env`
- Verify SMTP credentials are correct
- Check server logs for email service errors
- Ensure `APP_URL` is set correctly

### Token Expired Error
- Tokens expire after 1 hour
- Request a new password reset if token expires

### Database Migration Fails
- Ensure you have proper database permissions
- Check that the `users` table exists
- Verify database connection settings

## Files Modified/Created

### New Files:
- `src/controllers/user/forgotPassword.js` - Forgot password controller
- `src/controllers/user/resetPassword.js` - Reset password controller
- `src/views/forgotPassword.hbs` - Forgot password page
- `src/views/resetPassword.hbs` - Reset password page
- `database/add_password_reset_fields.sql` - SQL migration file
- `database/migrate_password_reset.js` - Node.js migration script

### Modified Files:
- `src/models/User.js` - Added password reset fields
- `src/routes/user.routes.js` - Added forgot/reset password routes
- `src/app.js` - Added frontend routes
- `src/views/login.hbs` - Added "Forgot Password?" link
- `package.json` - Added migration script

## Notes

- The reset link format is: `${APP_URL}/reset-password?token=${resetToken}`
- Tokens are single-use and expire after 1 hour
- Password reset emails use a premium HTML template
- The feature follows security best practices for password reset flows



