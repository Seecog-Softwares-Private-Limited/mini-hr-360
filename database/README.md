# Database Seed Files

This directory contains SQL seed files for initializing the database.

## seed.sql

This file contains the complete database schema and seed data for the `mini_hr_360` database.

### Usage

To seed the database with initial data, run:

```bash
npm run seed-db
```

This will:
1. Create the database `mini_hr_360` if it doesn't exist
2. Create all tables with their structure
3. Populate tables with seed data
4. Set up foreign key relationships

### Important Notes

- The seed script is **idempotent** - safe to run multiple times
- Existing data will be preserved (duplicate entries are skipped)
- The script uses the database credentials from `property.env`
- Make sure MySQL server is running before executing the seed script

### Manual Setup

If you prefer to run the SQL manually:

```bash
mysql -u your_username -p < database/seed.sql
```

Or using MySQL command line:

```sql
mysql -u your_username -p
source database/seed.sql;
```

## File Structure

- `seed.sql` - Complete database schema and seed data
- Other `.sql` files - Historical database dumps



