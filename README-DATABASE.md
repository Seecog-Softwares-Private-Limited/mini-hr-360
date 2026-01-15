# Database Setup Guide

## 🚀 Quick Start

After cloning or pulling the project, run this **single command** to sync your database:

```bash
npm run sync-db
```

This command will:
- ✅ Create all required tables if they don't exist
- ✅ Add any missing columns to existing tables
- ✅ Preserve all existing data
- ✅ Update your database to match the latest model definitions
- ✅ Handle errors gracefully (warnings about existing data are normal)

## What the Sync Script Does

The `sync-db` script (`database/sync-database.js`) automatically:

1. **Connects to your database** using credentials from `property.env`
2. **Syncs all Sequelize models** in the correct order (respecting foreign key dependencies)
3. **Adds missing columns** without dropping existing data
4. **Reports success/failure** for each model

## When to Run

Run `npm run sync-db` when:
- ✅ After pulling new code from the repository
- ✅ After adding new models or columns to existing models
- ✅ When you see database schema errors
- ✅ Setting up the project for the first time

## Safety

- **Idempotent**: Safe to run multiple times
- **Non-destructive**: Only adds missing columns, never deletes data
- **Preserves data**: Existing records remain intact

## Troubleshooting

If you encounter errors:

1. **Check database connection**: Ensure `property.env` has correct database credentials
2. **Check MySQL is running**: Make sure your MySQL server is running
3. **Review error messages**: The script will show which model failed and why

## Manual Database Setup

If you prefer to set up the database manually, you can:

1. Import a SQL dump from the `database/` folder
2. Or use Sequelize migrations (if available)

However, **`npm run sync-db` is the recommended approach** as it's automatic and always up to date.
