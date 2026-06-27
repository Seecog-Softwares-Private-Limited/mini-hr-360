import {
  LIFECYCLE_STAGES,
  POST_DOCUMENT_STAGE,
} from '../../src/config/lifecycleWorkflows.js';
import {
  validateDocumentGates,
  isDocumentAllowed,
} from '../../src/services/employeeLifecycle.service.js';

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function buildMockEmployee(overrides = {}) {
  return {
    employeeType: 'Permanent',
    lifecycleStage: 'prospect',
    empName: 'Asha Sharma',
    empEmail: 'asha@example.com',
    empDesignation: 'Software Engineer',
    empDepartment: 'Engineering',
    empWorkLoc: 'Mumbai',
    empCtc: 720000,
    empDateOfJoining: '2024-04-01',
    resignationDate: '2025-05-15',
    lastWorkingDay: '2025-06-15',
    contractEndDate: '2025-12-31',
    internStipend: null,
    internshipStartDate: '2024-06-01',
    ...overrides,
  };
}

/**
 * Simulates document generation stage transitions (no DB).
 */
export function simulateDocumentSequence(employee, docCodes) {
  let stage = employee.lifecycleStage || 'prospect';
  const steps = [];

  for (const rawCode of docCodes) {
    const emp = { ...employee, lifecycleStage: stage };
    const allowed = isDocumentAllowed(emp, rawCode);
    const gates = validateDocumentGates(emp, rawCode);

    steps.push({
      doc: rawCode,
      stageBefore: stage,
      allowed,
      gatesValid: gates.valid,
      missing: gates.missing,
    });

    if (!allowed) {
      throw new Error(
        `Document ${rawCode} not allowed at stage "${stage}" for type ${emp.employeeType}`
      );
    }
    if (!gates.valid) {
      throw new Error(
        `Document ${rawCode} failed gates at stage "${stage}": ${gates.missing.join(', ')}`
      );
    }

    const code = gates.code;
    const nextStage = POST_DOCUMENT_STAGE[code];
    if (nextStage) {
      const currentIdx = LIFECYCLE_STAGES.indexOf(stage);
      const nextIdx = LIFECYCLE_STAGES.indexOf(nextStage);
      if (nextIdx > currentIdx || nextStage === 'offboarding' || nextStage === 'exited') {
        stage = nextStage;
      }
    }
    steps[steps.length - 1].stageAfter = stage;
  }

  return { finalStage: stage, steps };
}

export async function runTestSuite(name, tests) {
  let passed = 0;
  let failed = 0;
  console.log(`\n── ${name} ──`);

  for (const [label, fn] of tests) {
    try {
      await fn();
      passed++;
      console.log(`  ✅ ${label}`);
    } catch (err) {
      failed++;
      console.log(`  ❌ ${label}`);
      console.log(`     ${err.message}`);
    }
  }

  return { passed, failed };
}
