import express from 'express';
import { sequelize } from './db/index.js'; // adjust path if needed

const app = express();
const PORT = process.env.PORT || 3000;

// middlewares
app.use(express.json());

// health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 🔐 SAFE STARTUP WRAPPER
(async function startServer() {
  try {
    console.log('⏳ Connecting to database...');

    await sequelize.authenticate();
    console.log('✅ Database authenticated');

    await sequelize.sync(); // or { alter: true } / { force: false }
    console.log('✅ Database synced');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error('❌ Startup failed');
    console.error('Reason:', err.message);

    // Optional: log full error in dev
    if (process.env.NODE_ENV !== 'production') {
      console.error(err);
    }

    // 🔴 IMPORTANT: clean exit (prevents nodemon crash loop)
    process.exit(1);
  }
})();
