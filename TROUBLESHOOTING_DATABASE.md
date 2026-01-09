# Database Initialization Troubleshooting

## Problem: "Database not initialized" Error

### Root Cause Analysis

The error occurs when:
1. The `users` table doesn't exist in the database
2. Sequelize sync hasn't run or failed silently
3. Server is using old database configuration

### Step-by-Step Diagnosis

#### 1. Check Server Logs

Look for these messages on server startup:

**✅ Good (Tables Created):**
```
🔧 Using STAGE database config (NODE_ENV=development)
DB_HOST : localhost
✅ MySQL connected → Database: mini_hr_360 @ localhost:3306
🔄 Starting schema sync...
✅ Schema synced successfully (alter mode).
✅ Verified: users table exists.
```

**❌ Bad (Tables Not Created):**
```
✅ MySQL connected → Database: mini_hr_360 @ localhost:3306
ℹ️ Skipping schema sync (set SYNC_DB=true to enable).
```

#### 2. Verify Configuration

Check `property.env`:
```bash
NODE_ENV=development
SYNC_DB=true
CREATE_DB_IF_MISSING=true

# Stage config (for development)
DB_HOST_STAGE=localhost
DB_PORT_STAGE=3306
DB_NAME_STAGE=mini_hr_360
DB_USER_STAGE=root
DB_PASSWORD_STAGE=
```

#### 3. Check Database Connection

Verify MySQL is running and accessible:
```bash
mysql -u root -p
# Should connect successfully
```

#### 4. Verify Database Exists

```sql
SHOW DATABASES;
-- Should see 'mini_hr_360'
USE mini_hr_360;
SHOW TABLES;
-- Should see 'users' table if sync worked
```

### Solutions

#### Solution 1: Restart Server (Most Common Fix)

1. **Stop the server** (Ctrl+C)
2. **Verify `SYNC_DB=true`** in `property.env`
3. **Restart server:**
   ```bash
   npm run dev
   ```
4. **Watch for "Schema synced" message**

#### Solution 2: Manual Table Creation

If sync fails, create tables manually:

```bash
npm run migrate-password-reset-sequelize
```

#### Solution 3: Check MySQL Connection

If connection fails:
1. Ensure MySQL is running: `brew services start mysql` (Mac) or `sudo systemctl start mysql` (Linux)
2. Verify credentials in `property.env`
3. Test connection: `mysql -u root -p`

#### Solution 4: Force Table Creation

If `alter: true` doesn't work, temporarily use:

```javascript
// In src/db/index.js (temporary)
await sequelize.sync({ force: false }); // Creates all tables
```

### Common Issues

#### Issue 1: Server Not Restarted
**Symptom:** Old config still in use  
**Fix:** Restart server after changing `property.env`

#### Issue 2: Wrong Database
**Symptom:** Connecting to production instead of stage  
**Fix:** Verify `NODE_ENV=development` and stage config variables

#### Issue 3: MySQL Not Running
**Symptom:** Connection refused  
**Fix:** Start MySQL service

#### Issue 4: Permission Denied
**Symptom:** Access denied for user  
**Fix:** Check `DB_USER_STAGE` and `DB_PASSWORD_STAGE` credentials

### Verification Checklist

- [ ] `NODE_ENV=development` in `property.env`
- [ ] `SYNC_DB=true` in `property.env`
- [ ] Stage database config variables set (`DB_HOST_STAGE`, etc.)
- [ ] MySQL server is running
- [ ] Server restarted after config changes
- [ ] Server logs show "Schema synced successfully"
- [ ] `users` table exists in database

### Debug Commands

```bash
# Check if server is running
ps aux | grep "node.*index.js"

# Check MySQL status
brew services list | grep mysql  # Mac
sudo systemctl status mysql      # Linux

# Test database connection
mysql -h localhost -u root -p -e "SHOW DATABASES;"

# Check if tables exist
mysql -h localhost -u root -p mini_hr_360 -e "SHOW TABLES;"
```

### After Fix

Once tables are created, you should see:
- ✅ "Schema synced successfully" in logs
- ✅ "users table exists" verification
- ✅ Forgot password endpoint works
- ✅ No more "Database not initialized" errors



