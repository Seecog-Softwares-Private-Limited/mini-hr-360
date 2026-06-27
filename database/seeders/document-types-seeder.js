/**
 * Seed standard document types with HTML templates.
 * Usage: npm run seed:document-types
 * Idempotent — updates template if code exists, creates if missing.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../property.env') });

const { sequelize } = await import('../../src/db/index.js');
const DocumentType = (await import('../../src/models/DocumentType.js')).default;
const { DOCUMENT_TYPE_SEEDS } = await import('../../src/config/documentTypeTemplates.js');

async function seed() {
  await sequelize.authenticate();
  console.log('🌱 Document Types Seeder\n');

  let created = 0;
  let updated = 0;

  for (const seedRow of DOCUMENT_TYPE_SEEDS) {
    const existing = await DocumentType.findOne({ where: { code: seedRow.code } });
    if (existing) {
      await existing.update({
        name: seedRow.name,
        icon: seedRow.icon,
        description: seedRow.description,
        templateHtml: seedRow.templateHtml,
        isDeleted: false,
        deletedAt: null,
      });
      updated++;
      console.log(`  ↻ Updated ${seedRow.code}`);
    } else {
      await DocumentType.create({
        name: seedRow.name,
        code: seedRow.code,
        icon: seedRow.icon,
        description: seedRow.description,
        templateHtml: seedRow.templateHtml,
        isDeleted: false,
      });
      created++;
      console.log(`  ✓ Created ${seedRow.code}`);
    }
  }

  console.log(`\n✅ Done: ${created} created, ${updated} updated (${DOCUMENT_TYPE_SEEDS.length} total)`);
  await sequelize.close();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
