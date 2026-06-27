// src/index.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load property.env before app modules (email, DB, etc.) read process.env
dotenv.config({
    path: process.env.DOTENV_CONFIG_PATH || path.join(__dirname, '../property.env'),
});

const { app } = await import('./app.js');

// Import DB only after env is loaded
const { default: connectDB } = await import('./db/index.js');

// Initialize Razorpay service
const { default: razorpayService } = await import('./services/razorpay.service.js');
razorpayService.initialize();

await connectDB();

const { startLifecycleAlertsJob } = await import('./jobs/lifecycleAlerts.job.js');
startLifecycleAlertsJob();

const PORT = Number.parseInt(process.env.PORT, 10) || 3007;

function shutdownServer(signal) {
  console.log(`${signal} received. Shutting down gracefully...`);
  clearInterval(globalThis.__keepAlive);

  const finish = () => process.exit(0);

  const closeDb = async () => {
    try {
      const { sequelize } = await import('./db/index.js');
      await sequelize.close();
    } catch (_) {
      /* ignore */
    }
  };

  if (globalThis.__server) {
    globalThis.__server.close(async () => {
      await closeDb();
      console.log('Server closed');
      finish();
    });
    setTimeout(async () => {
      await closeDb();
      finish();
    }, 2000).unref();
  } else {
    closeDb().finally(finish);
  }
}

// Store server reference globally to prevent GC
globalThis.__server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access at: http://localhost:${PORT}`);
});

// Keep the process alive with server error handling
globalThis.__server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\n❌ Port ${PORT} is already in use. Another server is still running.\n` +
      `   Fix: stop the other process, then restart.\n` +
      `   macOS/Linux: lsof -ti:${PORT} | xargs kill -9\n` +
      `   Or use only one of: npm run dev  OR  npm start (not both).\n`
    );
    process.exit(1);
    return;
  }
  console.error('Server error:', err);
  process.exit(1);
});

// Keep the event loop active
globalThis.__keepAlive = setInterval(() => {}, 1 << 30);

// nodemon sends SIGUSR2 on restart — release port before respawn
process.on('SIGUSR2', () => shutdownServer('SIGUSR2'));
process.on('SIGINT', () => shutdownServer('SIGINT'));
process.on('SIGTERM', () => shutdownServer('SIGTERM'));
