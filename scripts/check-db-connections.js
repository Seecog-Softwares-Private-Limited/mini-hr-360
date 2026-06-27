/**
 * Inspect MySQL connection usage (helps diagnose pool exhaustion).
 * Usage: npx cross-env DOTENV_CONFIG_PATH=./property.env node -r dotenv/config scripts/check-db-connections.js
 */
import { sequelize } from '../src/db/index.js';

await sequelize.authenticate();

const [rows] = await sequelize.query(`
  SELECT user, host, db, command, time, state
  FROM information_schema.processlist
  WHERE user = DATABASE()
     OR db = DATABASE()
  ORDER BY time DESC
`);

console.log(`Active MySQL sessions for ${process.env.DB_NAME}: ${rows.length}`);
for (const row of rows.slice(0, 20)) {
  console.log(`  ${row.command} ${row.time}s state=${row.state || '-'} host=${row.host}`);
}
if (rows.length > 20) console.log(`  ... and ${rows.length - 20} more`);

const sleeping = rows.filter((r) => r.command === 'Sleep' && r.time > 60);
if (sleeping.length) {
  console.log(`\n⚠️  ${sleeping.length} long-idle Sleep connection(s) — often from nodemon restarts without pool.close().`);
  console.log('   Restart the dev server once; shutdown now closes the pool on exit.');
}

await sequelize.close();
