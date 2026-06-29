// src/routes/adminProfile.routes.js
import { Router } from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';
import {
    renderProfile,
    renderChangePassword,
    updatePassword,
    uploadAvatar,
} from '../controllers/admin/adminProfile.controller.js';
import { isPlatformAdmin, listUsersForRequest } from '../services/organization.service.js';

const router = Router();

// Dashboard-style profile routes
router.get('/profile', verifyUser, renderProfile);
router.post('/profile/avatar', verifyUser, uploadAvatar);
router.get('/change-password', verifyUser, renderChangePassword);
router.post('/change-password', verifyUser, updatePassword);

// Team & Roles management page (org-scoped for owners; platform-wide for super admins)
router.get('/team', verifyUser, (req, res) => {
    res.render('admin/team', {
        title: 'Team & Roles',
        active: 'team',
        user: req.user,
        isPlatformAdmin: isPlatformAdmin(req.user),
    });
});

// Organization-scoped users for payroll approval workflow and team management
router.get('/users', verifyUser, async (req, res) => {
    try {
        const users = await listUsersForRequest(req);
        res.json({ data: users });
    } catch (error) {
        console.error('Error fetching organization users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

export default router;
export { router as adminProfileRouter };
