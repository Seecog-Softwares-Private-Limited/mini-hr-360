import express from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';
import {
  renderOnboardingWorkflowPage,
  apiGetOnboardingWizard,
  apiPatchOnboardingStage,
} from '../controllers/onboardingWorkflow.controller.js';

const router = express.Router();

router.get('/onboarding-workflow/:employeeId', verifyUser, renderOnboardingWorkflowPage);
router.get('/api/v1/employees/:employeeId/onboarding-wizard', verifyUser, apiGetOnboardingWizard);
router.patch('/api/v1/employees/:employeeId/onboarding-stage', verifyUser, express.json(), apiPatchOnboardingStage);

export default router;
