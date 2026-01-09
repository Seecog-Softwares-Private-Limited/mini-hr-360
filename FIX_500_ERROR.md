# Fix 500 Error on Forgot Password

## Problem
Getting `500 Internal Server Error` when calling `/api/v1/users/forgot-password`

## Most Likely Cause
The database table `users` is missing the `passwordResetToken` and `passwordResetExpires` columns.

## Solution

### Step 1: Run the Database Migration

Run the migration script to add the required columns:

```bash
npm run migrate-password-reset
```

Or manually:

```bash
DOTENV_CONFIG_PATH=./property.env node -r dotenv/config --experimental-json-modules database/migrate_password_reset.js
```

### Step 2: Verify Migration Success

The script will output:
```
✅ Added passwordResetToken column
✅ Added passwordResetExpires column
✅ Created index on passwordResetToken
✅ Created index on passwordResetExpires
✅ Migration completed successfully!
```

### Step 3: Restart Server

After migration, restart your server:

```bash
npm run dev
```

### Step 4: Test Again

Try the forgot password endpoint again. It should work now.

## Alternative: Manual SQL Migration

If the script doesn't work, run this SQL directly:

```sql
ALTER TABLE users 
ADD COLUMN passwordResetToken VARCHAR(255) NULL AFTER refreshTokenExpiresAt,
ADD COLUMN passwordResetExpires DATETIME NULL AFTER passwordResetToken;

CREATE INDEX idx_password_reset_token ON users(passwordResetToken);
CREATE INDEX idx_password_reset_expires ON users(passwordResetExpires);
```

## Error Handling

The application now has improved error handling:
- Better error messages for database errors
- Clear indication if migration is needed
- Proper error logging for debugging

## Check Server Logs

After adding error handling, check your server logs. You should see:
- `❌ Error:` - The actual error
- `Stack:` - Error stack trace
- `⚠️ Database migration required!` - If columns are missing

## Still Getting Errors?

1. Check server logs for the actual error message
2. Verify database connection is working
3. Ensure you have proper database permissions
4. Check that the `users` table exists



