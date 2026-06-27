import { normalizeDocCode } from './lifecycleWorkflows.js';

const WRAPPER = (body) => `
<div style="font-family: Arial, sans-serif; font-size: 14px; color: #222; line-height: 1.5;">
  ${body}
  <p style="margin-top: 24px;">Thanks &amp; Regards<br/><strong>HR Team</strong><br/>{{COMPANY_NAME}}</p>
</div>`;

/** Default subject + HTML body per document code (placeholders: {{EMP_NAME}}, {{DOC_LABEL}}, etc.) */
export const LIFECYCLE_EMAIL_TEMPLATES = {
  DEFAULT: {
    subject: '{{DOC_LABEL}} — {{EMP_NAME}}',
    bodyHtml: WRAPPER(
      `<p>Dear {{EMP_NAME}},</p>
       <p>Please find attached your <strong>{{DOC_LABEL}}</strong> for your review and records.</p>
       <p>If you have any questions, please reply to this email.</p>`
    ),
  },
  OFFER_LETTER: {
    subject: 'Offer of Employment — {{EMP_NAME}}',
    bodyHtml: WRAPPER(
      `<p>Dear {{EMP_NAME}},</p>
       <p>Congratulations! We are pleased to share your <strong>offer of employment</strong> as {{DESIGNATION}}.</p>
       <p>Your proposed date of joining is <strong>{{JOINING_DATE}}</strong>. Annual CTC: <strong>{{CTC}}</strong>.</p>
       <p>Please review the attached offer letter and confirm your acceptance with HR.</p>`
    ),
  },
  PROBATION_LETTER: {
    subject: 'Appointment Letter — {{EMP_NAME}}',
    bodyHtml: WRAPPER(
      `<p>Dear {{EMP_NAME}},</p>
       <p>Welcome aboard! Please find your <strong>appointment / probation letter</strong> confirming your role as {{DESIGNATION}} effective {{JOINING_DATE}}.</p>
       <p>We look forward to a successful journey together.</p>`
    ),
  },
  INTERNSHIP_OFFER: {
    subject: 'Internship Offer — {{EMP_NAME}}',
    bodyHtml: WRAPPER(
      `<p>Dear {{EMP_NAME}},</p>
       <p>Please find attached your <strong>internship offer letter</strong> for the {{DESIGNATION}} internship.</p>
       <p>Kindly review the terms and reach out to HR with any questions.</p>`
    ),
  },
  PRE_PLACEMENT_OFFER: {
    subject: 'Pre-Placement Offer (PPO) — {{EMP_NAME}}',
    bodyHtml: WRAPPER(
      `<p>Dear {{EMP_NAME}},</p>
       <p>Congratulations on your <strong>pre-placement offer</strong> for a full-time role upon successful completion of your internship.</p>
       <p>Please review the attached PPO letter for CTC and joining details.</p>`
    ),
  },
  INCREMENT_LETTER: {
    subject: 'Salary Revision — {{EMP_NAME}}',
    bodyHtml: WRAPPER(
      `<p>Dear {{EMP_NAME}},</p>
       <p>Please find attached your <strong>increment / salary revision letter</strong>.</p>
       <p>Your revised compensation is effective from {{EFFECTIVE_DATE}}.</p>`
    ),
  },
  BONUS_LETTER: {
    subject: 'Bonus Letter — {{EMP_NAME}}',
    bodyHtml: WRAPPER(
      `<p>Dear {{EMP_NAME}},</p>
       <p>Please find attached your <strong>bonus letter</strong> for this cycle.</p>`
    ),
  },
  SALARY_SLIP: {
    subject: 'Salary Slip — {{MONTH_YEAR}}',
    bodyHtml: WRAPPER(
      `<p>Dear {{EMP_NAME}},</p>
       <p>Please find attached your salary slip for <strong>{{MONTH_YEAR}}</strong>.</p>
       <p>For payroll queries, use the employee portal or contact HR.</p>`
    ),
  },
  INTERNSHIP_CERT: {
    subject: 'Internship Certificate — {{EMP_NAME}}',
    bodyHtml: WRAPPER(
      `<p>Dear {{EMP_NAME}},</p>
       <p>Please find attached your <strong>internship completion certificate</strong>.</p>
       <p>We wish you the best in your future endeavours.</p>`
    ),
  },
  RESIGNATION_ACCEPTANCE: {
    subject: 'Resignation Acceptance — {{EMP_NAME}}',
    bodyHtml: WRAPPER(
      `<p>Dear {{EMP_NAME}},</p>
       <p>Please find attached the <strong>resignation acceptance letter</strong> acknowledging your notice period.</p>
       <p>Your last working day is recorded as <strong>{{LAST_WORKING_DAY}}</strong>.</p>`
    ),
  },
  NO_DUES_CLEARANCE: {
    subject: 'No-Dues Clearance — {{EMP_NAME}}',
    bodyHtml: WRAPPER(
      `<p>Dear {{EMP_NAME}},</p>
       <p>Please find attached your <strong>no-dues clearance</strong> certificate as part of your exit process.</p>`
    ),
  },
  FULL_FINAL_STATEMENT: {
    subject: 'Full & Final Settlement — {{EMP_NAME}}',
    bodyHtml: WRAPPER(
      `<p>Dear {{EMP_NAME}},</p>
       <p>Please find attached your <strong>full &amp; final settlement statement</strong>.</p>
       <p>Contact Finance/HR if you have questions about the settlement breakdown.</p>`
    ),
  },
  RELIEVING_LETTER: {
    subject: 'Relieving Letter — {{EMP_NAME}}',
    bodyHtml: WRAPPER(
      `<p>Dear {{EMP_NAME}},</p>
       <p>Please find attached your <strong>relieving letter</strong>.</p>
       <p>We thank you for your contributions and wish you success ahead.</p>`
    ),
  },
};

export function getDefaultEmailTemplateForCode(code) {
  const normalized = normalizeDocCode(code);
  return LIFECYCLE_EMAIL_TEMPLATES[normalized] || LIFECYCLE_EMAIL_TEMPLATES.DEFAULT;
}
