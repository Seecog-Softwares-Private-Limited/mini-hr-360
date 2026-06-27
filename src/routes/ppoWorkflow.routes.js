import express from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';
import {
  renderPpoWorkflowPage,
  apiGetPpoWizard,
  apiExecutePpoConversion,
  apiInternCompletionExit,
} from '../controllers/ppoWorkflow.controller.js';

const router = express.Router();

router.get('/ppo-workflow/:employeeId', verifyUser, renderPpoWorkflowPage);
router.get('/api/v1/employees/:employeeId/ppo-wizard', verifyUser, apiGetPpoWizard);
router.post(
  '/api/v1/employees/:employeeId/ppo-wizard/convert',
  verifyUser,
  express.json(),
  apiExecutePpoConversion
);
router.post(
  '/api/v1/employees/:employeeId/ppo-wizard/complete-internship',
  verifyUser,
  express.json(),
  apiInternCompletionExit
);

export default router;
