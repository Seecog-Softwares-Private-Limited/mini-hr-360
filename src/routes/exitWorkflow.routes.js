import express from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';
import {
  renderExitWorkflowPage,
  apiGetExitWizard,
  apiSaveFnfSettlement,
  apiInitiateExitWizard,
  apiCompleteExitWizard,
  apiPatchExitChecklist,
  apiGetLifecycleAlerts,
} from '../controllers/exitWorkflow.controller.js';

const router = express.Router();

router.get('/exit-workflow/:employeeId', verifyUser, renderExitWorkflowPage);
router.get('/api/v1/lifecycle/alerts', verifyUser, apiGetLifecycleAlerts);
router.get('/api/v1/employees/:employeeId/exit-wizard', verifyUser, apiGetExitWizard);
router.patch('/api/v1/employees/:employeeId/fnf-settlement', verifyUser, express.json(), apiSaveFnfSettlement);
router.post('/api/v1/employees/:employeeId/exit-wizard/initiate', verifyUser, express.json(), apiInitiateExitWizard);
router.post('/api/v1/employees/:employeeId/exit-wizard/complete', verifyUser, express.json(), apiCompleteExitWizard);
router.patch('/api/v1/employees/:employeeId/exit-wizard/checklist', verifyUser, express.json(), apiPatchExitChecklist);

export default router;
