# Environment-Based Configuration

The project is now configured to automatically use different URLs based on the environment.

## Configuration Overview

### Production Environment
- **APP_URL**: `https://petserviceinhome.com`
- **API_BASE_URL**: `https://petserviceinhome.com/api/v1`
- **CORS Origins**: `https://petserviceinhome.com`, `https://www.petserviceinhome.com`

### Development Environment
- **APP_URL**: `http://localhost:3002`
- **API_BASE_URL**: `http://localhost:3002/api/v1`
- **CORS Origins**: `http://localhost:3002`, `http://localhost:5173`, `http://127.0.0.1:3002`, `http://127.0.0.1:5173`

## How It Works

### 1. Configuration Module (`src/config/app.config.js`)

Centralized configuration that automatically detects the environment:

```javascript
import { APP_URL, API_BASE_URL, CORS_ORIGINS } from './config/app.config.js';
```

**Logic:**
1. If `APP_URL` is explicitly set in `property.env`, use that value (allows override)
2. If `NODE_ENV=production`, use `https://petserviceinhome.com`
3. Otherwise (development), use `http://localhost:3002`

### 2. Backend Configuration

**CORS (`src/app.js`):**
- Automatically uses the correct origins based on environment
- No manual changes needed when deploying

**API Controllers:**
- `src/controllers/user/forgotPassword.js` - Uses `APP_URL` for reset links
- `src/controllers/wa/controller.wa.js` - Uses `APP_URL` for OAuth redirects

### 3. Frontend Configuration (`src/views/layouts/main.hbs`)

**API Base URL:**
- Automatically detects based on `window.location.hostname`
- Production: `https://petserviceinhome.com/api/v1`
- Development: `http://localhost:3002/api/v1`
- Fallback: Uses current origin

## Setup Instructions

### Development

1. Set `NODE_ENV=development` in `property.env`:
   ```bash
   NODE_ENV=development
   ```

2. Start the server:
   ```bash
   npm run dev
   ```

3. The application will automatically use:
   - `http://localhost:3002` for all URLs
   - `http://localhost:3002/api/v1` for API calls

### Production

1. Set `NODE_ENV=production` in your production environment:
   ```bash
   NODE_ENV=production
   ```

2. Deploy and start the server

3. The application will automatically use:
   - `https://petserviceinhome.com` for all URLs
   - `https://petserviceinhome.com/api/v1` for API calls

## Override (Optional)

If you need to override the automatic detection, set `APP_URL` in `property.env`:

```bash
APP_URL=https://custom-domain.com
```

This will override the automatic environment-based detection.

## Files Modified

1. **`src/config/app.config.js`** - Centralized configuration module
2. **`src/app.js`** - CORS configuration uses environment-based origins
3. **`src/views/layouts/main.hbs`** - Frontend API base URL auto-detection
4. **`src/controllers/user/forgotPassword.js`** - Uses `APP_URL` from config
5. **`src/controllers/wa/controller.wa.js`** - Uses `APP_URL` from config
6. **`property.env`** - Updated documentation for `APP_URL`

## Verification

On server startup, you'll see:
```
🌐 Environment: development (or production)
🌐 APP_URL: http://localhost:3002 (or https://petserviceinhome.com)
🌐 API_BASE_URL: http://localhost:3002/api/v1 (or https://petserviceinhome.com/api/v1)
```

In the browser console, you'll see:
```
🌐 API_BASE configured: http://localhost:3002/api/v1 (or https://petserviceinhome.com/api/v1)
```

## Benefits

✅ **Automatic Configuration** - No manual URL changes when deploying  
✅ **Environment-Aware** - Automatically uses correct URLs based on NODE_ENV  
✅ **Override Support** - Can still manually set APP_URL if needed  
✅ **Centralized** - Single source of truth for all URLs  
✅ **Type-Safe** - Consistent configuration across the application  
✅ **Debug-Friendly** - Logs show configured URLs on startup



