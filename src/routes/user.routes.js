import express from 'express';
import { loginUser, logoutUser } from '../controllers/user/login.js';
import register from '../controllers/user/register.js';
import { verifyUser } from '../middleware/authMiddleware.js';
import { refresh } from '../controllers/user/refreshToken.js';
import { forgotPassword } from '../controllers/user/forgotPassword.js';
import { resetPassword } from '../controllers/user/resetPassword.js';


const router = express.Router();

router.post('/register', register);
router.post('/login', loginUser);
router.post("/refresh", refresh);
router.post('/logout', verifyUser, logoutUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;