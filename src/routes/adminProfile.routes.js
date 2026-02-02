// src/routes/adminProfile.routes.js
import { Router } from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';
import {
    renderProfile,
    renderChangePassword,
    updatePassword,
} from '../controllers/admin/adminProfile.controller.js';

const router = Router();

// Dashboard-style profile routes
router.get('/profile', verifyUser, renderProfile);
router.get('/change-password', verifyUser, renderChangePassword);
router.post('/change-password', verifyUser, updatePassword);

export default router;
export { router as adminProfileRouter };
