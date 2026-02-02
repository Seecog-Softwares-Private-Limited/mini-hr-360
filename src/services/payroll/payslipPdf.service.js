import fs from 'fs';
import path from 'path';
import pdf from 'html-pdf-node';
import { Payslip, Employee, PayrollRun, PayrollSetting, Business } from '../../models/index.js';

export const generatePayslipPdf = async (payslipId, templateOverride = null) => {
  const payslip = await Payslip.findByPk(payslipId, {
    include: [
      { model: Employee, as: 'employee' },
      { model: PayrollRun, as: 'payrollRun' }
    ]
  });

  if (!payslip) throw new Error('Payslip not found');

  const business = await Business.findByPk(payslip.payrollRun.businessId);
  const settings = await PayrollSetting.findOne({ where: { businessId: business.id } });

  const template = templateOverride || settings?.statutoryConfig?.template || {};
  const companyName = template.companyName || business.businessName || 'Your Company';
  const companyAddress = template.companyAddress || 'Company Address';
  const logoUrl = template.logoUrl || '';

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const periodName = `${monthNames[payslip.periodMonth - 1]} ${payslip.periodYear}`;

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; margin: 0; padding: 40px; }
      .header { text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
      .company-name { font-size: 24px; font-weight: bold; color: #1e1b4b; margin-bottom: 5px; }
      .company-address { font-size: 13px; color: #666; }
      .payslip-title { font-size: 18px; font-weight: 600; margin-top: 15px; color: #4338ca; text-transform: uppercase; }
      
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
      .info-item { font-size: 13px; }
      .label { color: #888; font-size: 11px; text-transform: uppercase; margin-bottom: 3px; }
      .value { font-weight: 600; }

      .table-container { margin-bottom: 30px; }
      .section-title { font-size: 14px; font-weight: 700; background: #f3f4f6; padding: 8px 12px; margin-bottom: 10px; border-radius: 4px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { text-align: left; padding: 8px 12px; color: #666; font-weight: 600; border-bottom: 1px solid #e5e7eb; }
      td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; }
      .text-right { text-align: right; }

      .total-row { font-weight: 700; background: #f9fafb; }
      
      .net-pay-box { 
        background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); 
        color: white; 
        padding: 20px; 
        border-radius: 8px; 
        text-align: center; 
        margin-top: 30px;
      }
      .net-pay-label { font-size: 12px; opacity: 0.9; margin-bottom: 5px; }
      .net-pay-value { font-size: 32px; font-weight: 800; }

      .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 20px; }
    </style>
  </head>
  <body>
    <div class="header">
      ${logoUrl ? `<img src="${logoUrl}" style="max-height: 60px; margin-bottom: 10px;">` : ''}
      <div class="company-name">${companyName}</div>
      <div class="company-address">${companyAddress}</div>
      <div class="payslip-title">Payslip for ${periodName}</div>
    </div>

    <div class="info-grid">
      <div class="info-item">
        <div class="label">Employee Name</div>
        <div class="value">${payslip.employee?.empName}</div>
      </div>
      <div class="info-item">
        <div class="label">Employee ID</div>
        <div class="value">${payslip.employee?.empId}</div>
      </div>
      <div class="info-item">
        <div class="label">Designation</div>
        <div class="value">${payslip.employee?.empDesignation || '-'}</div>
      </div>
      <div class="info-item">
        <div class="label">Department</div>
        <div class="value">${payslip.employee?.empDepartment || '-'}</div>
      </div>
    </div>

    <div class="table-container">
      <div class="section-title">Earnings</div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="text-right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(payslip.earnings).map(([k, v]) => `
            <tr>
              <td>${k}</td>
              <td class="text-right">${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td>Gross Earnings</td>
            <td class="text-right">₹${Object.values(payslip.earnings).reduce((a, b) => a + Number(b), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="table-container">
      <div class="section-title">Deductions</div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="text-right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(payslip.deductions).map(([k, v]) => `
            <tr>
              <td>${k}</td>
              <td class="text-right">${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td>Total Deductions</td>
            <td class="text-right">₹${Object.values(payslip.deductions).reduce((a, b) => a + Number(b), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="net-pay-box">
      <div class="net-pay-label">NET TAKE HOME PAY</div>
      <div class="net-pay-value">₹${Number(payslip.netPay).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>

    <div class="footer">
      This is a system-generated payslip and does not require a physical signature.<br>
      © ${new Date().getFullYear()} ${companyName}. All rights reserved.
    </div>
  </body>
  </html>
  `;

  const outputDir = path.join(process.cwd(), 'storage/payslips');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const fileName = `payslip_${payslip.employee.empId}_${payslip.periodYear}_${payslip.periodMonth}.pdf`;
  const filePath = path.join(outputDir, fileName);

  const options = { format: 'A4', margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' } };
  const pdfBuffer = await pdf.generatePdf({ content: html }, options);
  fs.writeFileSync(filePath, pdfBuffer);

  return `storage/payslips/${fileName}`;
};
