# Fix Database Error - Users Table Doesn't Exist

## Error Message
```
Error at Query.run
at async User.findOne
Table 'mini_hr_360.users' doesn't exist
```

## Problem
The database `mini_hr_360` exists but is **empty** - no tables have been created yet.

## Solution Options

### Option 1: Enable Sequelize Sync (Easiest - Recommended)

1. **Edit `property.env`:**
   ```bash
   SYNC_DB=true
   ```

2. **Restart your server:**
   ```bash
   npm run dev
   ```

3. **Sequelize will automatically:**
   - Create all tables (users, employees, etc.)
   - Add all columns including password reset fields
   - Set up indexes and relationships

4. **After tables are created, disable sync (for production safety):**
   ```bash
   SYNC_DB=false
   ```

### Option 2: Run Database Seed Script

If you have a seed SQL file:

1. **Run the seed script:**
   ```bash
   npm run seed-db
   ```

2. **Then run migration for password reset columns:**
   ```bash
   npm run migrate-password-reset-sequelize
   ```

### Option 3: Import SQL Dump Manually

If you have a SQL dump file:

1. **Import the SQL file:**
   ```bash
   mysql -h [DB_HOST] -u [DB_USER] -p mini_hr_360 < database/seed.sql
   ```

2. **Then run migration:**
   ```bash
   npm run migrate-password-reset-sequelize
   ```

## Quick Fix (Recommended)

**The fastest solution is Option 1:**

1. Open `property.env`
2. Change `SYNC_DB=false` to `SYNC_DB=true`
3. Restart server: `npm run dev`
4. Wait for "Schema synced" message
5. Change `SYNC_DB=true` back to `SYNC_DB=false`
6. Restart server again

## Verification

After enabling SYNC_DB and restarting, you should see:
```
✅ MySQL connected → Database: mini_hr_360
🔄 Schema synced (alter).
```

Then the forgot password endpoint should work!

## Important Notes

- **SYNC_DB=true** will create/update tables automatically
- **SYNC_DB=false** (default) skips schema sync for production safety
- After tables are created, you can safely disable SYNC_DB
- The password reset columns will be created automatically when SYNC_DB is enabled



