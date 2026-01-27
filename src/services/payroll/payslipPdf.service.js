import fs from 'fs';
import path from 'path';
import pdf from 'html-pdf-node';
import PayrollRunItem from '../../models/PayrollRunItem.js';
import Employee from '../../models/Employee.js';

export const generatePayslipPdf = async (payslip, runItem) => {
  const employee = await Employee.findByPk(runItem.employeeId);

  const html = `
  <html>
    <body style="font-family: Arial; font-size:12px;">
      <h2>Payslip – ${payslip.month}</h2>
      <p><b>Employee:</b> ${employee.name}</p>

      <h3>Earnings</h3>
      <ul>
        ${Object.entries(runItem.earnings)
          .map(([k, v]) => `<li>${k}: ₹${v}</li>`)
          .join('')}
      </ul>

      <h3>Deductions</h3>
      <ul>
        ${Object.entries(runItem.deductions)
          .map(([k, v]) => `<li>${k}: ₹${v}</li>`)
          .join('')}
      </ul>

      <h3>Net Pay: ₹${runItem.netPay}</h3>
    </body>
  </html>
  `;

  const outputDir = path.join(process.cwd(), 'storage/payslips');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filePath = path.join(outputDir, `payslip_${payslip.id}.pdf`);

  const pdfBuffer = await pdf.generatePdf({ content: html }, { format: 'A4' });
  fs.writeFileSync(filePath, pdfBuffer);

  return filePath;
};
