/** Lifecycle stages in order */
export const LIFECYCLE_STAGES = [
  'prospect',
  'offer',
  'joining',
  'active',
  'confirmed',
  'offboarding',
  'exited',
];

export const LIFECYCLE_STAGE_LABELS = {
  prospect: 'Prospect',
  offer: 'Offer',
  joining: 'Joining',
  active: 'Active',
  confirmed: 'Confirmed',
  offboarding: 'Offboarding',
  exited: 'Exited',
};

/** Normalize document type codes (aliases → canonical) */
export const DOCUMENT_CODE_ALIASES = {
  INTERN_OFFER: 'INTERNSHIP_OFFER',
  INTERNSHIP_OFFER_LETTER: 'INTERNSHIP_OFFER',
  INTERNSHIP_CERTIFICATE: 'INTERNSHIP_CERT',
  PPO: 'PRE_PLACEMENT_OFFER',
  PPO_LETTER: 'PRE_PLACEMENT_OFFER',
  PPO_OFFER: 'PRE_PLACEMENT_OFFER',
  PROBATION: 'PROBATION_LETTER',
  INCREMENT: 'INCREMENT_LETTER',
  BONUS: 'BONUS_LETTER',
  RELIEVING: 'RELIEVING_LETTER',
  RELIEVING_EXPERIENCE: 'RELIEVING_LETTER',
  RESIGNATION_ACCEPT: 'RESIGNATION_ACCEPTANCE',
  RESIGN_ACCEPT_LETTER: 'RESIGNATION_ACCEPTANCE',
  NO_DUES: 'NO_DUES_CLEARANCE',
  NO_DUES_FORM: 'NO_DUES_CLEARANCE',
  FULL_FINAL: 'FULL_FINAL_STATEMENT',
  FULL_FINAL_SETTLEMENT: 'FULL_FINAL_STATEMENT',
  FULL_AND_FINAL: 'FULL_FINAL_STATEMENT',
  FNF_STATEMENT: 'FULL_FINAL_STATEMENT',
};

export function normalizeDocCode(code) {
  const upper = String(code || '').toUpperCase();
  return DOCUMENT_CODE_ALIASES[upper] || upper;
}

/**
 * Allowed documents per employee type + lifecycle stage.
 * Empty array for a stage = no documents allowed at that stage.
 */
export const WORKFLOW_MATRIX = {
  Permanent: {
    prospect: ['OFFER_LETTER'],
    offer: ['OFFER_LETTER', 'PROBATION_LETTER'],
    joining: ['PROBATION_LETTER'],
    active: [
      'PROBATION_LETTER',
      'SALARY_SLIP',
      'INCREMENT_LETTER',
      'BONUS_LETTER',
      'RESIGNATION_ACCEPTANCE',
    ],
    confirmed: [
      'SALARY_SLIP',
      'INCREMENT_LETTER',
      'BONUS_LETTER',
      'RESIGNATION_ACCEPTANCE',
    ],
    offboarding: [
      'RESIGNATION_ACCEPTANCE',
      'NO_DUES_CLEARANCE',
      'FULL_FINAL_STATEMENT',
      'RELIEVING_LETTER',
    ],
    exited: ['RELIEVING_LETTER'],
  },
  Contract: {
    prospect: ['OFFER_LETTER'],
    offer: ['OFFER_LETTER', 'PROBATION_LETTER'],
    joining: ['PROBATION_LETTER'],
    active: [
      'PROBATION_LETTER',
      'SALARY_SLIP',
      'INCREMENT_LETTER',
      'BONUS_LETTER',
      'OFFER_LETTER',
      'RESIGNATION_ACCEPTANCE',
    ],
    confirmed: [
      'SALARY_SLIP',
      'INCREMENT_LETTER',
      'BONUS_LETTER',
      'OFFER_LETTER',
      'RESIGNATION_ACCEPTANCE',
    ],
    offboarding: [
      'RESIGNATION_ACCEPTANCE',
      'NO_DUES_CLEARANCE',
      'FULL_FINAL_STATEMENT',
      'RELIEVING_LETTER',
    ],
    exited: ['RELIEVING_LETTER'],
  },
  Consultant: {
    prospect: ['OFFER_LETTER'],
    offer: ['OFFER_LETTER'],
    joining: ['PROBATION_LETTER'],
    active: ['SALARY_SLIP', 'BONUS_LETTER', 'RESIGNATION_ACCEPTANCE'],
    confirmed: ['SALARY_SLIP', 'BONUS_LETTER', 'RESIGNATION_ACCEPTANCE'],
    offboarding: [
      'NO_DUES_CLEARANCE',
      'FULL_FINAL_STATEMENT',
      'RELIEVING_LETTER',
    ],
    exited: ['RELIEVING_LETTER'],
  },
  Trainee: {
    prospect: ['OFFER_LETTER', 'INTERNSHIP_OFFER'],
    offer: ['OFFER_LETTER', 'INTERNSHIP_OFFER', 'PROBATION_LETTER'],
    joining: ['PROBATION_LETTER', 'INTERNSHIP_OFFER'],
    active: [
      'PROBATION_LETTER',
      'SALARY_SLIP',
      'INCREMENT_LETTER',
      'PRE_PLACEMENT_OFFER',
      'RESIGNATION_ACCEPTANCE',
    ],
    confirmed: ['SALARY_SLIP', 'INCREMENT_LETTER', 'BONUS_LETTER'],
    offboarding: [
      'RESIGNATION_ACCEPTANCE',
      'NO_DUES_CLEARANCE',
      'FULL_FINAL_STATEMENT',
      'RELIEVING_LETTER',
    ],
    exited: ['RELIEVING_LETTER'],
  },
  Intern: {
    prospect: ['INTERNSHIP_OFFER'],
    offer: ['INTERNSHIP_OFFER'],
    joining: ['INTERNSHIP_OFFER'],
    active: ['INTERNSHIP_OFFER', 'SALARY_SLIP', 'INTERNSHIP_CERT', 'PRE_PLACEMENT_OFFER'],
    confirmed: ['SALARY_SLIP', 'INTERNSHIP_CERT', 'PRE_PLACEMENT_OFFER'],
    offboarding: ['INTERNSHIP_CERT', 'RELIEVING_LETTER', 'NO_DUES_CLEARANCE'],
    exited: ['INTERNSHIP_CERT', 'RELIEVING_LETTER'],
  },
};

/** Stage to move to after a document is generated */
export const POST_DOCUMENT_STAGE = {
  OFFER_LETTER: 'offer',
  INTERNSHIP_OFFER: 'offer',
  PRE_PLACEMENT_OFFER: 'joining',
  PROBATION_LETTER: 'active',
  INTERNSHIP_CERT: 'offboarding',
  RESIGNATION_ACCEPTANCE: 'offboarding',
  NO_DUES_CLEARANCE: 'offboarding',
  FULL_FINAL_STATEMENT: 'offboarding',
  RELIEVING_LETTER: 'exited',
};

/** Required employee fields before generating a document */
export const DOCUMENT_GATES = {
  OFFER_LETTER: ['empName', 'empEmail', 'empDesignation', 'empDepartment', 'empWorkLoc', 'empCtc'],
  INTERNSHIP_OFFER: ['empName', 'empEmail', 'empDesignation', 'empDepartment'],
  PROBATION_LETTER: ['empName', 'empDateOfJoining', 'empDesignation', 'empWorkLoc'],
  PRE_PLACEMENT_OFFER: ['empName', 'empCtc', 'empDateOfJoining'],
  INCREMENT_LETTER: ['empName', 'empCtc'],
  INTERNSHIP_CERT: ['empName'],
  BONUS_LETTER: ['empName'],
  SALARY_SLIP: ['empName', 'empCtc'],
  RESIGNATION_ACCEPTANCE: ['empName', 'resignationDate', 'lastWorkingDay'],
  NO_DUES_CLEARANCE: ['empName', 'lastWorkingDay'],
  FULL_FINAL_STATEMENT: ['empName', 'lastWorkingDay'],
  RELIEVING_LETTER: ['empName', 'empDateOfJoining', 'lastWorkingDay'],
};

/** Recommended next document codes per type + stage */
export const RECOMMENDED_NEXT = {
  Permanent: {
    prospect: 'OFFER_LETTER',
    offer: 'PROBATION_LETTER',
    joining: 'PROBATION_LETTER',
    active: 'SALARY_SLIP',
    confirmed: 'SALARY_SLIP',
    offboarding: 'RESIGNATION_ACCEPTANCE',
    exited: null,
  },
  Contract: {
    prospect: 'OFFER_LETTER',
    offer: 'PROBATION_LETTER',
    joining: 'PROBATION_LETTER',
    active: 'SALARY_SLIP',
    confirmed: 'SALARY_SLIP',
    offboarding: 'RESIGNATION_ACCEPTANCE',
    exited: null,
  },
  Intern: {
    prospect: 'INTERNSHIP_OFFER',
    offer: 'INTERNSHIP_OFFER',
    joining: 'INTERNSHIP_OFFER',
    active: 'INTERNSHIP_CERT',
    confirmed: 'INTERNSHIP_CERT',
    offboarding: 'INTERNSHIP_CERT',
    exited: null,
  },
  Consultant: {
    prospect: 'OFFER_LETTER',
    offer: 'PROBATION_LETTER',
    joining: 'PROBATION_LETTER',
    active: 'SALARY_SLIP',
    confirmed: 'SALARY_SLIP',
    offboarding: 'RELIEVING_LETTER',
    exited: null,
  },
  Trainee: {
    prospect: 'OFFER_LETTER',
    offer: 'PROBATION_LETTER',
    joining: 'PROBATION_LETTER',
    active: 'SALARY_SLIP',
    confirmed: 'SALARY_SLIP',
    offboarding: 'RESIGNATION_ACCEPTANCE',
    exited: null,
  },
};

/** Ordered exit document sequence */
export const EXIT_DOCUMENT_SEQUENCE = [
  'RESIGNATION_ACCEPTANCE',
  'NO_DUES_CLEARANCE',
  'FULL_FINAL_STATEMENT',
  'RELIEVING_LETTER',
];

export const INTERN_EXIT_SEQUENCE = ['INTERNSHIP_CERT', 'RELIEVING_LETTER'];
