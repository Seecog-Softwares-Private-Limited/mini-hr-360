// src/index.js
// import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from './app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load property.env BEFORE importing anything that reads process.env
// dotenv.config({ path: path.join(__dirname, '../property.env') });

// Import DB only after env is loaded
const { default: connectDB } = await import('./db/index.js');

// Initialize Razorpay service
const { default: razorpayService } = await import('./services/razorpay.service.js');
razorpayService.initialize();

await connectDB();

const PORT = Number.parseInt(process.env.PORT, 10) || 3007;

// Store server reference globally to prevent GC
globalThis.__server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access at: http://localhost:${PORT}`);
});

// Keep the process alive with server error handling
globalThis.__server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

// Keep the event loop active
globalThis.__keepAlive = setInterval(() => {}, 1 << 30);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  clearInterval(globalThis.__keepAlive);
  globalThis.__server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
