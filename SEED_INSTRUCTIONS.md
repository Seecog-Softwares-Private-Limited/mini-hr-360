# Database Seed Setup Instructions

## ✅ What Has Been Set Up

1. **Seed Script**: `seed-database.js` - Ready to execute SQL dumps
2. **Package Script**: Added `npm run seed-db` command
3. **Documentation**: Setup guides created

## 📝 What You Need to Do

### Step 1: Copy Your Complete SQL Dump

Copy your **complete SQL dump** (the one you provided) to the file:

```
database/seed.sql
```

**Important:** 
- Replace the existing partial content in `database/seed.sql` with your complete SQL dump
- Make sure it starts with: `use mini_hr_360;`
- Include ALL tables, data, and relationships

### Step 2: Verify Database Credentials

Check that `property.env` has correct database credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mini_hr_360
DB_USER=your_username
DB_PASSWORD=your_password
```

### Step 3: Run the Seed Script

Execute:

```bash
npm run seed-db
```

This will:
- ✅ Create database `mini_hr_360` if it doesn't exist
- ✅ Create all tables
- ✅ Insert all seed data
- ✅ Set up foreign keys and indexes

## 🎯 Quick Command Reference

```bash
# Seed the database
npm run seed-db

# Start the application
npm start

# Reset database (if needed)
npm run reset-db
```

## 📋 Your SQL Dump Should Include

Your SQL dump should contain:

1. ✅ `use mini_hr_360;` statement
2. ✅ All `CREATE TABLE` statements for:
   - users
   - businesses
   - customers
   - campaigns
   - templates
   - employees
   - departments
   - designations
   - document_types (with templateHtml fields)
   - email_templates
   - leave_types
   - leave_requests
   - employee_documents
   - employee_educations
   - employee_experiences
   - business_addresses
   - countries
   - states
   - services
   - plans
   - message_logs
   - And any other tables

3. ✅ All `INSERT` statements with seed data
4. ✅ All indexes and foreign key constraints

## 🔍 Verification

After running `npm run seed-db`, verify:

```sql
mysql -u your_username -p
USE mini_hr_360;
SHOW TABLES;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM document_types;
```

## ⚠️ Troubleshooting

- **File not found**: Make sure `database/seed.sql` exists and contains your SQL dump
- **Access denied**: Check MySQL credentials in `property.env`
- **Duplicate entry errors**: Normal if running multiple times - script is idempotent
- **Syntax errors**: Verify your SQL dump is valid MySQL syntax

## 📚 Additional Resources

- See `SETUP_DATABASE.md` for detailed setup instructions
- See `database/README.md` for file structure information



