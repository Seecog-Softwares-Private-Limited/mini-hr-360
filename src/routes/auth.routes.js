import { Router } from 'express';
import { unifiedLogin } from '../controllers/auth/unifiedLogin.controller.js';

const router = Router();

router.post('/login', unifiedLogin);

export default router;
