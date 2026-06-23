import { Router } from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';
import { attachWorkspaceContext } from '../middleware/workspaceMiddleware.js';
import {
  clearWorkspace,
  createWorkspace,
  getCurrentWorkspace,
  getWorkspacePermissions,
  listWorkspaces,
  switchWorkspace,
} from '../controllers/workspace.controller.js';

const router = Router();

router.use(verifyUser);
router.use(attachWorkspaceContext);

router.get('/', listWorkspaces);
router.get('/current', getCurrentWorkspace);
router.get('/permissions', getWorkspacePermissions);
router.post('/create', createWorkspace);
router.post('/switch', switchWorkspace);
router.post('/clear', clearWorkspace);

export default router;
