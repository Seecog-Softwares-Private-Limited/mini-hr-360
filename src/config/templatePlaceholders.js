/** Common template placeholders for HR letter editors */
export const TEMPLATE_PLACEHOLDER_GROUPS = [
  {
    label: 'Employee',
    placeholders: [
      { token: '{{EMP_NAME}}', desc: 'Full name' },
      { token: '{{EMP_ID}}', desc: 'Employee code / ID' },
      { token: '{{EMP_EMAIL}}', desc: 'Work email' },
      { token: '{{DESIGNATION}}', desc: 'Job title' },
      { token: '{{DEPARTMENT}}', desc: 'Department' },
      { token: '{{LOCATION}}', desc: 'Work location' },
      { token: '{{JOINING_DATE}}', desc: 'Date of joining' },
    ],
  },
  {
    label: 'Compensation',
    placeholders: [
      { token: '{{CTC}}', desc: 'Annual CTC (numeric)' },
      { token: '{{CTC_IN_WORDS}}', desc: 'CTC in words' },
      { token: '{{BASIC_MONTH}}', desc: 'Monthly basic' },
      { token: '{{HRA_MONTH}}', desc: 'Monthly HRA' },
      { token: '{{GROSS_MONTH}}', desc: 'Monthly gross' },
      { token: '{{NET_PAY}}', desc: 'Net monthly pay' },
    ],
  },
  {
    label: 'Offer / Internship',
    placeholders: [
      { token: '{{OFFER_DATE}}', desc: 'Offer letter date' },
      { token: '{{StartDateDisplay}}', desc: 'Internship start (display)' },
      { token: '{{EndDateDisplay}}', desc: 'Internship end (display)' },
      { token: '{{StipendText1}}', desc: 'Stipend paragraph 1' },
      { token: '{{PPO_REF_NO}}', desc: 'PPO reference number' },
    ],
  },
  {
    label: 'Exit / Offboarding',
    placeholders: [
      { token: '{{RESIGNATION_DATE}}', desc: 'Resignation date' },
      { token: '{{LAST_WORKING_DAY}}', desc: 'Last working day' },
      { token: '{{RELIEVING_DATE}}', desc: 'Relieving date' },
      { token: '{{NET_PAYABLE}}', desc: 'F&F net payable' },
    ],
  },
  {
    label: 'Branding',
    placeholders: [
      { token: '{{LOGO_SRC}}', desc: 'Company logo (base64 img)' },
      { token: '{{STAMP_SRC}}', desc: 'Company stamp' },
      { token: '{{SIGNATURE_SRC}}', desc: 'Authorized signatory' },
    ],
  },
];

export const SAMPLE_PREVIEW_DATA = {
  EMP_NAME: 'Priya Sharma',
  EMP_ID: 'EMP-1042',
  EMP_EMAIL: 'priya.sharma@example.com',
  DESIGNATION: 'Software Engineer',
  DEPARTMENT: 'Engineering',
  LOCATION: 'Bengaluru',
  OFFER_DATE: '26 June 2025',
  JOINING_DATE: '15 July 2025',
  CTC: '8,40,000.00',
  CTC_IN_WORDS: 'Eight Lakh Forty Thousand Rupees Only',
  LETTER_DATE: '26 June 2025',
};
