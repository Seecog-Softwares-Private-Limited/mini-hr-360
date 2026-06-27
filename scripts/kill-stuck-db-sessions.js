/**
 * Kill long-running MySQL sessions blocking the app (metadata locks from stuck SYNC_DB).
 * Usage: npx cross-env DOTENV_CONFIG_PATH=./property.env node -r dotenv/config scripts/kill-stuck-db-sessions.js
 */
import { sequelize } from '../src/db/index.js';

const MIN_AGE_SEC = Number(process.env.KILL_DB_SESSION_MIN_AGE_SEC || 120);

await sequelize.authenticate();

const [stuck] = await sequelize.query(`
  SELECT id, user, host, db, command, time, state, info
  FROM information_schema.processlist
  WHERE db = DATABASE()
    AND id != CONNECTION_ID()
    AND time >= :minAge
    AND (
      state LIKE '%metadata lock%'
      OR command = 'Sleep'
    )
  ORDER BY time DESC
`, { replacements: { minAge: MIN_AGE_SEC } });

if (!stuck.length) {
  console.log('No stuck sessions found.');
  await sequelize.close();
  process.exit(0);
}

console.log(`Found ${stuck.length} stuck session(s) (>= ${MIN_AGE_SEC}s):`);
let killed = 0;
for (const row of stuck) {
  const label = `id=${row.id} ${row.command} ${row.time}s ${row.state || ''}`;
  try {
    await sequelize.query('KILL :id', { replacements: { id: row.id } });
    console.log(`  KILLED ${label}`);
    killed++;
  } catch (err) {
    console.log(`  SKIP ${label} — ${err.parent?.sqlMessage || err.message}`);
  }
}

console.log(`Done. Killed ${killed}/${stuck.length}.`);
await sequelize.close();
