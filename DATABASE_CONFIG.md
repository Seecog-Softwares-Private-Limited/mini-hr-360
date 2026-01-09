# Database Configuration by Environment

## Overview

The database configuration automatically switches based on `NODE_ENV`:

- **Development** (`NODE_ENV=development`): Uses **Stage** database config
- **Production** (`NODE_ENV=production`): Uses **Production** database config

## Configuration in `property.env`

### Stage Database (Development)

```env
# Stage (used when NODE_ENV=development)
DB_HOST_STAGE=localhost
DB_PORT_STAGE=3306
DB_NAME_STAGE=mini_hr_360
DB_USER_STAGE=root
DB_PASSWORD_STAGE=
```

### Production Database

```env
# Production (used when NODE_ENV=production)
DB_HOST=ls-322b13a438adc6602193777abc66dd7f1b391154.cd0w8y80q80x.ap-south-1.rds.amazonaws.com
DB_PORT=3306
DB_NAME=mini_hr_360
DB_USER=dbmasteruser
DB_PASSWORD=&s0rpr,(G2+1sv7rT3MGKa{c:-j<ebN:
```

## How It Works

The database connection code in `src/db/index.js` checks `NODE_ENV`:

```javascript
if (NODE_ENV === 'development') {
  // Use Stage config (DB_HOST_STAGE, DB_PORT_STAGE, etc.)
} else {
  // Use Production config (DB_HOST, DB_PORT, etc.)
}
```

## Usage

### Development Mode

```bash
# Set in property.env
NODE_ENV=development

# Start server
npm run dev

# Will connect to: localhost:3306 (Stage database)
```

### Production Mode

```bash
# Set in production environment
NODE_ENV=production

# Start server
npm start

# Will connect to: AWS RDS (Production database)
```

## Logging

On startup, you'll see which config is being used:

**Development:**
```
🔧 Using STAGE database config (NODE_ENV=development)
DB_HOST : localhost
DB_PORT : 3306
DB_NAME : mini_hr_360
```

**Production:**
```
🔧 Using PRODUCTION database config (NODE_ENV=production)
DB_HOST : ls-322b13a438adc6602193777abc66dd7f1b391154...
DB_PORT : 3306
DB_NAME : mini_hr_360
```

## Benefits

✅ **Automatic Configuration** - No manual switching needed  
✅ **Environment-Aware** - Uses correct database based on NODE_ENV  
✅ **Safe Development** - Development uses local/stage database  
✅ **Production Ready** - Production uses AWS RDS automatically

## Important Notes

- Make sure `NODE_ENV` is set correctly in your environment
- Stage config variables use `_STAGE` suffix (e.g., `DB_HOST_STAGE`)
- Production config variables use standard names (e.g., `DB_HOST`)
- Default fallback is Stage config if `NODE_ENV` is not set



