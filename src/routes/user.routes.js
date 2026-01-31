import express from 'express';
import { loginUser, logoutUser } from '../controllers/user/login.js';
import register from '../controllers/user/register.js';
import { verifyUser } from '../middleware/authMiddleware.js';
import { refresh } from '../controllers/user/refreshToken.js';
import { checkEmail } from '../controllers/user/checkEmail.js';
import { verifyOTP } from '../controllers/user/verifyOTP.js';



const router = express.Router();

router.post('/register', register);
router.get('/check-email', checkEmail);
router.post('/login', loginUser);
router.post('/verify-otp', verifyOTP);
router.post("/refresh", refresh);

router.post('/logout', verifyUser, logoutUser);

export default router;