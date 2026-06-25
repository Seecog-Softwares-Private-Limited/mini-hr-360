/**
 * Adds organization_members table and businesses.inviteCode column.
 * Run: node database/migrations/create-organization-members.cjs
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'property.env' });

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'mini_hr_360',
  });

  try {
    const [inviteCol] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'businesses' AND COLUMN_NAME = 'inviteCode'`
    );
    if (!inviteCol.length) {
      await conn.query(
        `ALTER TABLE businesses ADD COLUMN inviteCode VARCHAR(16) NULL UNIQUE AFTER country`
      );
      console.log('Added businesses.inviteCode');
    }

    await conn.query(`
      CREATE TABLE IF NOT EXISTS organization_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        businessId INT NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'member',
        status ENUM('active','inactive') NOT NULL DEFAULT 'active',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_org_member_user_business (userId, businessId),
        KEY idx_org_member_business (businessId),
        CONSTRAINT fk_org_member_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_org_member_business FOREIGN KEY (businessId) REFERENCES businesses(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('organization_members table ready');

    const [rows] = await conn.query(
      `SELECT id FROM businesses WHERE inviteCode IS NULL OR inviteCode = ''`
    );
    for (const row of rows) {
      const code = require('crypto').randomBytes(4).toString('hex').toUpperCase();
      await conn.query(`UPDATE businesses SET inviteCode = ? WHERE id = ?`, [code, row.id]);
    }
    if (rows.length) console.log(`Backfilled invite codes for ${rows.length} businesses`);
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
