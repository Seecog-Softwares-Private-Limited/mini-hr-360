/**
 * Add critical employee lifecycle columns when Sequelize alter-sync fails
 * (e.g. MySQL 64-key limit on large tables).
 */
export async function ensureEmployeeLifecycleColumns(sequelize) {
  const [rows] = await sequelize.query(`
    SELECT COLUMN_NAME AS name
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'employees'
  `);
  const existing = new Set(rows.map((r) => r.name));

  const alters = [];

  if (!existing.has('internStipend')) {
    alters.push('ADD COLUMN `internStipend` DECIMAL(15,2) NULL');
  }
  if (!existing.has('contractEndDate')) {
    alters.push('ADD COLUMN `contractEndDate` DATE NULL');
  }
  if (!existing.has('empIncrementEffectiveDate')) {
    alters.push('ADD COLUMN `empIncrementEffectiveDate` DATE NULL');
  }
  if (!existing.has('lifecycleStage')) {
    alters.push(
      "ADD COLUMN `lifecycleStage` ENUM('prospect','offer','joining','active','confirmed','offboarding','exited') NOT NULL DEFAULT 'prospect'"
    );
  }
  if (!existing.has('offboardingChecklist')) {
    alters.push('ADD COLUMN `offboardingChecklist` JSON NULL');
  }
  if (!existing.has('fnfSettlement')) {
    alters.push('ADD COLUMN `fnfSettlement` JSON NULL');
  }

  if (!alters.length) return;

  for (const clause of alters) {
    try {
      await sequelize.query(`ALTER TABLE \`employees\` ${clause}`);
      console.log(`   ✅ employees column ensured: ${clause.match(/`(\w+)`/)?.[1] || clause}`);
    } catch (err) {
      console.error(`   ⚠️ Could not add employee column (${clause}): ${err.message}`);
    }
  }
}
