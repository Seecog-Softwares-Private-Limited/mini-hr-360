import { Router } from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';
import { attachWorkspaceContext } from '../middleware/workspaceMiddleware.js';
import { getWidgets, getInsights, getCommandCenter } from '../controllers/dashboard.controller.js';

const router = Router();

router.use(verifyUser);
router.use(attachWorkspaceContext);

router.get('/widgets', getWidgets);
router.get('/insights', getInsights);
router.get('/command-center', getCommandCenter);

export default router;
