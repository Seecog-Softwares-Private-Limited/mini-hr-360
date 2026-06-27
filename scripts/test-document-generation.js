import { sequelize } from '../src/db/index.js';
import { generatePdfFromTemplate } from '../src/utils/generatePdfFromTemplate.js';
import Employee from '../src/models/Employee.js';
import DocumentType from '../src/models/DocumentType.js';
import DocumentApprovalRequest from '../src/models/DocumentApprovalRequest.js';
import { queueDocumentApproval } from '../src/services/documentApproval.service.js';

await sequelize.authenticate();
console.log('DB ok');

try {
  const buf = await generatePdfFromTemplate('<html><body><h1>{{name}}</h1></body></html>', { name: 'Test' });
  console.log('Puppeteer PDF ok, bytes:', buf.length);
} catch (e) {
  console.error('Puppeteer FAILED:', e.message);
  process.exitCode = 1;
}

const tables = ['employee_generated_documents', 'document_approval_requests', 'employee_documents'];
for (const t of tables) {
  const [rows] = await sequelize.query(`SHOW TABLES LIKE '${t}'`);
  console.log(`Table ${t}:`, rows.length ? 'exists' : 'MISSING');
}

const employee = await Employee.findOne({ order: [['id', 'DESC']] });
const docType = await DocumentType.findOne({ where: { code: 'INTERNSHIP_OFFER' } });
console.log('Employee:', employee?.id, employee?.empName);
console.log('DocType:', docType?.id, docType?.code, 'hasTemplate:', Boolean(docType?.templateHtml));

if (employee && docType) {
  try {
    const buf = await generatePdfFromTemplate(docType.templateHtml.slice(0, 500) + '</body></html>', {
      EMP_NAME: employee.empName,
      EMP_ID: employee.empId,
    });
    console.log('Template snippet PDF ok');
  } catch (e) {
    console.error('Template PDF failed:', e.message);
  }

  try {
    const approval = await queueDocumentApproval({
      businessId: employee.businessId,
      employeeId: employee.id,
      documentTypeId: docType.id,
      code: 'INTERNSHIP_OFFER',
      pdfBuffer: Buffer.from('%PDF-1.4 test'),
      fileName: 'test.pdf',
      requestedByUserId: null,
      metadata: {},
    });
    console.log('queueDocumentApproval ok:', approval.id);
    await DocumentApprovalRequest.destroy({ where: { id: approval.id } });
  } catch (e) {
    console.error('queueDocumentApproval FAILED:', e.name, e.message);
    if (e.parent) console.error(' SQL:', e.parent.sqlMessage);
  }
}

await sequelize.close();
