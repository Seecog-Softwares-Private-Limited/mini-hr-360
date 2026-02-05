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

// Team & Roles management page
router.get('/team', verifyUser, (req, res) => {
    res.render('admin/team', {
        title: 'Team & Roles',
        active: 'team',
        user: req.user,
    });
});

export default router;
export { router as adminProfileRouter };
