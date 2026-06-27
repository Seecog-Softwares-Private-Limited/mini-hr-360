import { normalizeDocCode } from './lifecycleWorkflows.js';

/** Document codes that require HR approval before email/vault delivery */
export const APPROVAL_REQUIRED_CODES = new Set([
  'OFFER_LETTER',
  'INTERNSHIP_OFFER',
  'PRE_PLACEMENT_OFFER',
]);

export function requiresDocumentApproval(code) {
  return APPROVAL_REQUIRED_CODES.has(normalizeDocCode(code));
}

/** Auto-tick offboarding checklist keys when a document is generated */
export const DOCUMENT_CHECKLIST_AUTO_TICK = {
  RESIGNATION_ACCEPTANCE: 'resignation_accepted',
  NO_DUES_CLEARANCE: 'no_dues_form',
  FULL_FINAL_STATEMENT: 'fnf_processed',
  RELIEVING_LETTER: 'relieving_letter',
  INTERNSHIP_CERT: 'internship_cert',
};
