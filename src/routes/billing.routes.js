// src/routes/billing.routes.js
import { Router } from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';
import { renderBillingPage } from '../controllers/billing.controller.js';

const router = Router();

// All routes require admin authentication
router.use(verifyUser);

// Billing page
router.get('/', renderBillingPage);

export default router;
export { router as billingRouter };
