/**
 * Seed default lifecycle email templates into email_templates (linked to document types).
 * Usage: npm run seed:lifecycle-emails
 * Idempotent — skips if template_key already exists.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../property.env') });

const { sequelize } = await import('../../src/db/index.js');
const EmailTemplate = (await import('../../src/models/EmailTemplate.js')).default;
const DocumentType = (await import('../../src/models/DocumentType.js')).default;
const { LIFECYCLE_EMAIL_TEMPLATES } = await import('../../src/config/lifecycleEmailTemplates.js');
const { normalizeDocCode } = await import('../../src/config/lifecycleWorkflows.js');

async function seed() {
  await sequelize.authenticate();
  console.log('🌱 Lifecycle email templates seeder\n');

  const docTypes = await DocumentType.findAll({ where: { isDeleted: false } });
  const byCode = new Map(docTypes.map((dt) => [normalizeDocCode(dt.code), dt]));

  let created = 0;
  let skipped = 0;

  for (const [code, template] of Object.entries(LIFECYCLE_EMAIL_TEMPLATES)) {
    if (code === 'DEFAULT') continue;
    const dt = byCode.get(normalizeDocCode(code));
    const templateKey = `LIFECYCLE_${code}`;

    const existing = await EmailTemplate.findOne({ where: { templateKey } });
    if (existing) {
      skipped++;
      continue;
    }

    await EmailTemplate.create({
      templateKey,
      templateName: `${code.replace(/_/g, ' ')} (lifecycle default)`,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      documentTypeId: dt?.id || null,
      isDefault: true,
      deleted: false,
    });
    created++;
    console.log(`  ✓ ${templateKey}`);
  }

  console.log(`\n✅ Done: ${created} created, ${skipped} skipped`);
  await sequelize.close();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
