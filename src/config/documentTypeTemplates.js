const baseStyles = `
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 12pt; color: #222; margin: 0; padding: 20mm; }
  .header { text-align: center; margin-bottom: 24px; }
  .header img { max-height: 60px; }
  h1 { font-size: 16pt; text-align: center; margin: 16px 0; }
  .meta { margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
  .sign { margin-top: 48px; }
`;

function letterShell(title, bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${baseStyles}</style></head><body>
<div class="header">{{#if LOGO_SRC}}<img src="{{LOGO_SRC}}" alt="Logo"/>{{/if}}</div>
<h1>${title}</h1>
${bodyHtml}
<div class="sign"><p>For {{COMPANY_NAME}}</p><p>Authorized Signatory</p>{{#if SIGNATURE_SRC}}<img src="{{SIGNATURE_SRC}}" height="50"/>{{/if}}</div>
</body></html>`;
}

export const DOCUMENT_TYPE_SEEDS = [
  {
    name: 'Employment Offer Letter',
    code: 'OFFER_LETTER',
    icon: 'fas fa-file-signature',
    description: 'Full-time employment offer with CTC breakup',
    templateHtml: letterShell('Offer of Employment', `
<div class="meta"><p>Date: {{OFFER_DATE}}</p><p>To,<br/><strong>{{EMP_NAME}}</strong></p></div>
<p>We are pleased to offer you the position of <strong>{{DESIGNATION}}</strong> in <strong>{{DEPARTMENT}}</strong> at {{LOCATION}}.</p>
<p>Your date of joining will be <strong>{{JOINING_DATE}}</strong>. Annual CTC: <strong>₹{{CTC}}</strong> ({{CTC_IN_WORDS}}).</p>
<table><tr><th>Component</th><th>Monthly (₹)</th><th>Annual (₹)</th></tr>
<tr><td>Basic</td><td>{{BASIC_MONTH}}</td><td>{{BASIC_ANNUAL}}</td></tr>
<tr><td>HRA</td><td>{{HRA_MONTH}}</td><td>{{HRA_ANNUAL}}</td></tr>
<tr><td>Special Allowance</td><td>{{SPECIAL_ALLOWANCE_MONTH}}</td><td>{{SPECIAL_ALLOWANCE_ANNUAL}}</td></tr>
<tr><td><strong>Gross</strong></td><td><strong>{{GROSS_MONTH}}</strong></td><td><strong>{{GROSS_ANNUAL}}</strong></td></tr></table>
<p>Net take-home (approx.): ₹{{NET_PAY}} per month.</p>`),
  },
  {
    name: 'Probation / Appointment Letter',
    code: 'PROBATION_LETTER',
    icon: 'fas fa-user-check',
    description: 'Joining confirmation and probation terms',
    templateHtml: letterShell('Appointment Letter', `
<div class="meta"><p>Date: {{LETTER_DATE}}</p><p>Dear <strong>{{EMP_NAME}}</strong>,</p></div>
<p>We confirm your appointment as <strong>{{DESIGNATION}}</strong> effective <strong>{{JOINING_DATE}}</strong> at {{WORK_LOCATION}}.</p>
<p>Probation period: <strong>{{PROBATION_PERIOD}}</strong> ending <strong>{{PROBATION_END_DATE}}</strong>.</p>
<p>Reporting Manager: {{REPORTING_MANAGER_NAME}} ({{REPORTING_MANAGER_DESIGNATION}}).</p>
<p>Working hours: {{WORKING_HOURS}}.</p>`),
  },
  {
    name: 'Internship Offer Letter',
    code: 'INTERNSHIP_OFFER',
    icon: 'fas fa-user-graduate',
    description: 'Paid or unpaid internship offer',
    templateHtml: letterShell('Internship Offer', `
<div class="meta"><p>Date: {{LetterDate}}</p><p>Dear <strong>{{FullName}}</strong>,</p></div>
<p>We offer you an internship as <strong>{{Designation}}</strong> in {{DepartmentName}} from {{StartDateDisplay}} to {{EndDateDisplay}} ({{NumberofMonths}}).</p>
<p>{{StipendText1}}</p><p>{{StipendText2}}</p>
<p>Supervisor: {{SupervisorName}} ({{SupervisorDesignation}}). Working hours: {{WorkingHours}}.</p>`),
  },
  {
    name: 'Pre-Placement Offer (PPO)',
    code: 'PRE_PLACEMENT_OFFER',
    icon: 'fas fa-award',
    description: 'Offer after successful internship',
    templateHtml: letterShell('Pre-Placement Offer', `
<div class="meta"><p>Ref: {{PPO_REF_NO}} | Date: {{IssueDate}}</p><p>Dear <strong>{{EMP_NAME}}</strong>,</p></div>
<p>Following your internship as <strong>{{InternshipDesignation}}</strong> ({{InternshipStartDate}} – {{InternshipEndDate}}), we are pleased to offer you full-time employment as <strong>{{Designation}}</strong>.</p>
<p>Joining date: <strong>{{JoiningDate}}</strong>. Annual CTC: <strong>₹{{CTC}}</strong>. Monthly fixed gross: ₹{{MonthlySalary}}.</p>`),
  },
  {
    name: 'Salary Increment Letter',
    code: 'INCREMENT_LETTER',
    icon: 'fas fa-chart-line',
    description: 'Salary revision letter',
    templateHtml: letterShell('Salary Increment Letter', `
<div class="meta"><p>Date: {{OFFER_DATE}}</p><p>Dear <strong>{{EMP_NAME}}</strong>,</p></div>
<p>We are pleased to inform you of a salary revision effective <strong>{{EFFECTIVE_DATE}}</strong>.</p>
<table><tr><th></th><th>Amount</th></tr>
<tr><td>Current monthly</td><td>{{AMOUNT}}</td></tr>
<tr><td>Revised monthly</td><td>{{REVISED_AMOUNT}}</td></tr>
<tr><td>Revised annual CTC</td><td>{{REVISED_ANNUAL_CTC}}</td></tr></table>`),
  },
  {
    name: 'Bonus Letter',
    code: 'BONUS_LETTER',
    icon: 'fas fa-gift',
    description: 'One-time bonus communication',
    templateHtml: letterShell('Bonus Letter', `
<div class="meta"><p>Date: {{DATE}}</p><p>Dear <strong>{{EMP_NAME}}</strong>,</p></div>
<p>We are pleased to award you a bonus of <strong>{{BONUS_AMOUNT}}</strong> ({{BONUS_IN_WORDS}}), credited on {{CREDIT_DATE}}.</p>`),
  },
  {
    name: 'Internship Completion Certificate',
    code: 'INTERNSHIP_CERT',
    icon: 'fas fa-certificate',
    description: 'Certificate on internship completion',
    templateHtml: letterShell('Certificate of Internship', `
<div style="text-align:center;margin:40px 0;"><p>This is to certify that</p>
<h2 style="border-bottom:1px solid #333;display:inline-block;padding:0 20px;">{{EMP_NAME}}</h2>
<p>has successfully completed an internship as <strong>{{INTERNSHIP_ROLE}}</strong> in {{DEPARTMENT_NAME}}</p>
<p>from <strong>{{PERIOD_FROM}}</strong> to <strong>{{PERIOD_TO}}</strong>.</p></div>`),
  },
  {
    name: 'Resignation Acceptance Letter',
    code: 'RESIGNATION_ACCEPTANCE',
    icon: 'fas fa-file-export',
    description: 'Accept employee resignation',
    templateHtml: letterShell('Resignation Acceptance', `
<div class="meta"><p>Date: {{LETTER_DATE}}</p><p>Dear <strong>{{EMP_NAME}}</strong>,</p></div>
<p>We acknowledge receipt of your resignation dated <strong>{{RESIGNATION_DATE}}</strong>.</p>
<p>Your last working day will be <strong>{{LAST_WORKING_DAY}}</strong>. Notice period: {{NOTICE_PERIOD}}.</p>`),
  },
  {
    name: 'No Dues Clearance Form',
    code: 'NO_DUES_CLEARANCE',
    icon: 'fas fa-clipboard-check',
    description: 'Clearance form at exit',
    templateHtml: letterShell('No Dues Clearance', `
<div class="meta"><p>Date: {{FORM_DATE}}</p><p>Employee: <strong>{{EMP_NAME}}</strong> ({{EMP_ID}})</p>
<p>Designation: {{DESIGNATION}} | Department: {{DEPARTMENT}}</p>
<p>Last working day: <strong>{{LWD}}</strong></p></div>
<table><tr><th>Department</th><th>Clearance</th><th>Sign</th></tr>
<tr><td>Reporting Manager</td><td></td><td></td></tr>
<tr><td>IT</td><td></td><td></td></tr>
<tr><td>Finance</td><td></td><td></td></tr>
<tr><td>HR</td><td></td><td></td></tr></table>`),
  },
  {
    name: 'Full & Final Settlement Statement',
    code: 'FULL_FINAL_STATEMENT',
    icon: 'fas fa-file-invoice-dollar',
    description: 'FNF settlement breakdown',
    templateHtml: letterShell('Full & Final Settlement', `
<div class="meta"><p>Employee: <strong>{{EMP_NAME}}</strong> ({{EMP_ID}})</p>
<p>Settlement date: {{SETTLEMENT_DATE}}</p></div>
<table><tr><th>Earnings</th><th>Amount (₹)</th></tr>
<tr><td>Salary</td><td>{{E_SALARY}}</td></tr>
<tr><td>Leave encashment</td><td>{{E_LEAVE_ENCASHMENT}}</td></tr>
<tr><td>Bonus / incentive</td><td>{{E_BONUS_INCENTIVE}}</td></tr>
<tr><td><strong>Net payable</strong></td><td><strong>{{NET_PAYABLE}}</strong></td></tr></table>
<p>{{NET_PAYABLE_WORDS}}</p>`),
  },
  {
    name: 'Relieving & Experience Letter',
    code: 'RELIEVING_LETTER',
    icon: 'fas fa-door-open',
    description: 'Relieving and experience certificate',
    templateHtml: letterShell('Relieving & Experience Letter', `
<div class="meta"><p>Date: {{LETTER_DATE}}</p><p>To Whom It May Concern,</p></div>
<p>This is to certify that <strong>{{EMP_NAME}}</strong> ({{EMP_ID}}) was employed with us as <strong>{{DESIGNATION}}</strong> in {{DEPARTMENT}} from <strong>{{PERIOD_FROM}}</strong> to <strong>{{PERIOD_TO}}</strong>.</p>
<p>We wish {{EMP_NAME}} success in future endeavours.</p>`),
  },
  {
    name: 'Salary Slip',
    code: 'SALARY_SLIP',
    icon: 'fas fa-receipt',
    description: 'Monthly payslip',
    templateHtml: `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${baseStyles}</style></head><body>
<h1>Salary Slip — {{Month}}</h1>
<p><strong>{{EMP_NAME}}</strong> ({{EMP_ID}}) | {{DESIGNATION}}</p>
<table><tr><th>Earnings</th><th>₹</th><th>Deductions</th><th>₹</th></tr>
<tr><td>Basic</td><td>{{BASIC}}</td><td>PF</td><td>{{PF}}</td></tr>
<tr><td>HRA</td><td>{{HRA}}</td><td>ESI</td><td>{{ESI}}</td></tr>
<tr><td>Special</td><td>{{SPECIAL}}</td><td>TDS</td><td>{{TDS}}</td></tr>
<tr><td><strong>Total</strong></td><td><strong>{{TOTAL_EARNINGS}}</strong></td><td><strong>Total</strong></td><td><strong>{{TOTAL_DEDUCTIONS}}</strong></td></tr></table>
<p><strong>Net Salary: ₹{{NET_SALARY}}</strong></p></body></html>`,
  },
];
