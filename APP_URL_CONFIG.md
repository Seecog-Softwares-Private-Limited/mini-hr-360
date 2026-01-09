# APP_URL Configuration

The application URL is automatically configured based on the environment.

## Configuration Logic

The `APP_URL` is determined in the following order:

1. **If `APP_URL` is explicitly set in `property.env`**: Uses that value (allows manual override)
2. **If `NODE_ENV=production`**: Uses `https://petserviceinhome.com`
3. **Otherwise (development)**: Uses `http://localhost:3002`

## Implementation

The configuration is centralized in `src/config/app.config.js`:

```javascript
import { APP_URL } from '../../config/app.config.js';
```

## Usage

All controllers that need the application URL should import from the config:

```javascript
import { APP_URL } from '../../config/app.config.js';

// Use APP_URL instead of process.env.APP_URL
const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
```

## Current Usage

- `src/controllers/user/forgotPassword.js` - Password reset email links
- `src/controllers/wa/controller.wa.js` - WhatsApp OAuth redirect URIs

## Environment Variables

### Development
```bash
NODE_ENV=development
# APP_URL will be: http://localhost:3002
```

### Production
```bash
NODE_ENV=production
# APP_URL will be: https://petserviceinhome.com
```

### Override (Optional)
```bash
APP_URL=https://custom-domain.com
# This will override the automatic detection
```

## Benefits

1. **Automatic Configuration**: No need to manually change URLs when deploying
2. **Environment-Aware**: Automatically uses the correct URL based on NODE_ENV
3. **Override Support**: Can still manually set APP_URL if needed
4. **Centralized**: Single source of truth for application URL



