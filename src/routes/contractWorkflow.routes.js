import express from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';
import {
  renderContractWorkflowPage,
  apiGetContractWizard,
  apiRenewContract,
  apiContractNonRenewal,
} from '../controllers/contractWorkflow.controller.js';

const router = express.Router();

router.get('/contract-workflow/:employeeId', verifyUser, renderContractWorkflowPage);
router.get('/api/v1/employees/:employeeId/contract-wizard', verifyUser, apiGetContractWizard);
router.post(
  '/api/v1/employees/:employeeId/contract-wizard/renew',
  verifyUser,
  express.json(),
  apiRenewContract
);
router.post(
  '/api/v1/employees/:employeeId/contract-wizard/non-renew',
  verifyUser,
  express.json(),
  apiContractNonRenewal
);

export default router;
