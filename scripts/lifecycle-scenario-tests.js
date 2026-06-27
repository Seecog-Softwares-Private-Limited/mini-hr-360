/**
 * In-memory lifecycle scenario tests (no DB writes).
 * Usage: npm run test:lifecycle:scenarios
 */
import dotenv from 'dotenv';
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || './property.env' });

import {
  assert,
  buildMockEmployee,
  simulateDocumentSequence,
  runTestSuite,
} from './lib/lifecycle-test-utils.js';
import { normalizeDocCode } from '../src/config/lifecycleWorkflows.js';
import { canGenerateLifecycleDocument } from '../src/config/lifecycleDocumentAuth.js';

const scenarios = [
  [
    'Permanent hire → offer → join → increment → exit',
    () => {
      const emp = buildMockEmployee({ employeeType: 'Permanent', lifecycleStage: 'prospect' });
      const { finalStage, steps } = simulateDocumentSequence(emp, [
        'OFFER_LETTER',
        'PROBATION_LETTER',
        'INCREMENT_LETTER',
        'RESIGNATION_ACCEPTANCE',
        'NO_DUES_CLEARANCE',
        'FULL_FINAL_STATEMENT',
        'RELIEVING_LETTER',
      ]);
      assert(finalStage === 'exited', `Expected exited, got ${finalStage}`);
      assert(steps.length === 7, 'Expected 7 document steps');
    },
  ],
  [
    'Paid intern → certificate → relieving exit',
    () => {
      const emp = buildMockEmployee({
        employeeType: 'Intern',
        lifecycleStage: 'active',
        empCtc: 0,
        internStipend: 18000,
      });
      const { finalStage } = simulateDocumentSequence(emp, [
        'INTERNSHIP_CERT',
        'RELIEVING_LETTER',
      ]);
      assert(finalStage === 'exited', `Expected exited, got ${finalStage}`);
    },
  ],
  [
    'Paid intern → PPO → appointment (permanent path)',
    () => {
      const emp = buildMockEmployee({
        employeeType: 'Intern',
        lifecycleStage: 'active',
        internStipend: 20000,
        empCtc: 0,
      });
      const ppo = simulateDocumentSequence(emp, ['PRE_PLACEMENT_OFFER']);
      // Document engine does not move backward from active → joining
      assert(ppo.finalStage === 'active', `PPO from active intern stays active, got ${ppo.finalStage}`);

      // PPO workflow converts type + sets joining before appointment letter
      const converted = buildMockEmployee({
        employeeType: 'Permanent',
        lifecycleStage: 'joining',
        empCtc: 600000,
      });
      const joined = simulateDocumentSequence(converted, ['PROBATION_LETTER']);
      assert(joined.finalStage === 'active', `Expected active after appointment, got ${joined.finalStage}`);
    },
  ],
  [
    'Unpaid intern → internship offer (gates pass with zero stipend)',
    () => {
      const emp = buildMockEmployee({
        employeeType: 'Intern',
        lifecycleStage: 'prospect',
        empCtc: 0,
        internStipend: 0,
      });
      const { finalStage } = simulateDocumentSequence(emp, ['INTERNSHIP_OFFER']);
      assert(finalStage === 'offer', `Expected offer, got ${finalStage}`);
    },
  ],
  [
    'Contract → renewal offer at active → exit sequence',
    () => {
      const emp = buildMockEmployee({
        employeeType: 'Contract',
        lifecycleStage: 'prospect',
      });
      const hired = simulateDocumentSequence(emp, ['OFFER_LETTER', 'PROBATION_LETTER']);
      assert(hired.finalStage === 'active', `Expected active after join, got ${hired.finalStage}`);

      const renewed = simulateDocumentSequence(
        { ...emp, lifecycleStage: 'active' },
        ['OFFER_LETTER', 'RESIGNATION_ACCEPTANCE', 'NO_DUES_CLEARANCE', 'RELIEVING_LETTER']
      );
      assert(renewed.finalStage === 'exited', `Expected exited, got ${renewed.finalStage}`);
    },
  ],
  [
    'Document code aliases normalize correctly',
    () => {
      assert(normalizeDocCode('PPO_LETTER') === 'PRE_PLACEMENT_OFFER', 'PPO alias');
      assert(normalizeDocCode('FNF_STATEMENT') === 'FULL_FINAL_STATEMENT', 'FNF alias');
      assert(normalizeDocCode('INTERNSHIP_CERTIFICATE') === 'INTERNSHIP_CERT', 'Cert alias');
    },
  ],
  [
    'Exit documents blocked for non-HR roles',
    () => {
      const hr = canGenerateLifecycleDocument({ role: 'HR_MANAGER' }, 'RELIEVING_LETTER');
      const emp = canGenerateLifecycleDocument({ role: 'EMPLOYEE' }, 'RELIEVING_LETTER');
      assert(hr.allowed === true, 'HR should generate exit docs');
      assert(emp.allowed === false, 'Employee role should be blocked');
    },
  ],
];

const main = async () => {
  console.log('Lifecycle scenario tests (in-memory)\n');
  const { passed, failed } = await runTestSuite('E2E scenario paths', scenarios);
  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
