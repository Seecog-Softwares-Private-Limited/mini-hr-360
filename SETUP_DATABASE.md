# Database Setup Guide

This guide explains how to set up the database with seed data for first-time installation.

## Quick Start

1. **Copy your SQL dump to the seed file:**
   ```bash
   # Copy your complete SQL dump content to database/seed.sql
   # Make sure it starts with: use mini_hr_360;
   ```

2. **Run the seed script:**
   ```bash
   npm run seed-db
   ```

## Detailed Instructions

### Step 1: Prepare the SQL Seed File

The seed script reads from `database/seed.sql`. You need to copy your complete SQL dump content to this file.

**Important:** Your SQL dump should:
- Start with `use mini_hr_360;`
- Include all `CREATE TABLE` statements
- Include all `INSERT` statements for seed data
- Include all indexes and foreign key constraints

### Step 2: Configure Database Credentials

Make sure your `property.env` file has the correct database credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mini_hr_360
DB_USER=your_username
DB_PASSWORD=your_password
```

### Step 3: Run the Seed Script

Execute the seed script:

```bash
npm run seed-db
```

The script will:
1. ✅ Create the database `mini_hr_360` if it doesn't exist
2. ✅ Create all tables with their structure
3. ✅ Populate tables with seed data
4. ✅ Set up foreign key relationships

### Step 4: Verify Installation

After seeding, you can verify by:

1. **Check database connection:**
   ```bash
   npm start
   ```

2. **Or manually check in MySQL:**
   ```sql
   mysql -u your_username -p
   USE mini_hr_360;
   SHOW TABLES;
   SELECT COUNT(*) FROM users;
   ```

## Troubleshooting

### Error: SQL seed file not found
- Make sure `database/seed.sql` exists
- Check that the file path is correct

### Error: DB_USER and DB_PASSWORD must be set
- Check your `property.env` file
- Make sure `DB_USER` and `DB_PASSWORD` are set

### Error: Access denied
- Verify your MySQL credentials
- Make sure the MySQL user has CREATE DATABASE privileges
- Check that MySQL server is running

### Error: Duplicate entry
- This is normal if you run the seed script multiple times
- The script is idempotent and will skip duplicate entries

## Manual Setup (Alternative)

If you prefer to set up the database manually:

```bash
# Connect to MySQL
mysql -u your_username -p

# Create database
CREATE DATABASE mini_hr_360 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Use the database
USE mini_hr_360;

# Source the SQL file
SOURCE database/seed.sql;
```

Or using command line:

```bash
mysql -u your_username -p mini_hr_360 < database/seed.sql
```

## Notes

- The seed script is **idempotent** - safe to run multiple times
- Existing data will be preserved (duplicate entries are skipped)
- The script temporarily disables foreign key checks for faster execution
- All tables are created with proper character set (utf8mb4) and collation

## Files

- `seed-database.js` - Main seed script
- `database/seed.sql` - SQL dump file (you need to create this with your SQL dump)
- `property.env` - Database configuration



