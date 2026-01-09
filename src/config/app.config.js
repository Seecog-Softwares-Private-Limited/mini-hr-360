// src/config/app.config.js
// Application configuration based on environment

/**
 * Get the application URL based on environment
 * Production: https://petserviceinhome.com
 * Development: http://localhost:3002
 */
export function getAppUrl() {
  const env = process.env.NODE_ENV || 'development';
  
  // If APP_URL is explicitly set in environment, use it
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  
  // Otherwise, set based on NODE_ENV
  if (env === 'production') {
    return 'https://petserviceinhome.com';
  }
  
  return 'http://localhost:3002';
}

/**
 * Get the API base URL based on environment
 * Production: https://petserviceinhome.com/api/v1
 * Development: http://localhost:3002/api/v1
 */
export function getApiBaseUrl() {
  return `${getAppUrl()}/api/v1`;
}

/**
 * Get CORS allowed origins based on environment
 * Production: https://petserviceinhome.com
 * Development: http://localhost:3002, http://localhost:5173
 */
export function getCorsOrigins() {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    return [
      'https://petserviceinhome.com',
      'https://www.petserviceinhome.com'
    ];
  }
  
  // Development origins
  return [
    'http://localhost:3002',
    'http://localhost:5173',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:5173'
  ];
}

// Export the resolved values
export const APP_URL = getAppUrl();
export const API_BASE_URL = getApiBaseUrl();
export const CORS_ORIGINS = getCorsOrigins();

// Log for debugging
console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🌐 APP_URL: ${APP_URL}`);
console.log(`🌐 API_BASE_URL: ${API_BASE_URL}`);

