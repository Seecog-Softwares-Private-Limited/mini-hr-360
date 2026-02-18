/**
 * Payroll Template Routes
 * Enterprise payroll template management
 */

import express from 'express';
import {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  calculateSalary,
} from '../controllers/payroll/salaryTemplateController.js';
import { verifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(verifyUser);

router.get('/templates', getAllTemplates);
router.get('/templates/:id', getTemplateById);
router.post('/templates', createTemplate);
router.post('/templates/calculate', calculateSalary);

export default router;
