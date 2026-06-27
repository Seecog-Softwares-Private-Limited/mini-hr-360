/** Human labels for exit document sequence steps */
export const EXIT_DOCUMENT_LABELS = {
  RESIGNATION_ACCEPTANCE: 'Resignation acceptance letter',
  NO_DUES_CLEARANCE: 'No-dues clearance form',
  FULL_FINAL_STATEMENT: 'Full & final settlement',
  RELIEVING_LETTER: 'Relieving / experience letter',
  INTERNSHIP_CERT: 'Internship completion certificate',
};

export function labelForExitDoc(code) {
  return EXIT_DOCUMENT_LABELS[code] || code;
}
