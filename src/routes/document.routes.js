// src/routes/document.routes.js
import express from 'express';
import {
    renderDocumentsPage,
    generateDocument,
} from '../controllers/document.controller.js';
import {
    getLifecycle,
    validateDocumentForEmployee,
} from '../controllers/lifecycle.controller.js';
import { verifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// HTML page (with employees + document types)
router.get('/documents', verifyUser, renderDocumentsPage);

// Lifecycle helpers for document wizard
router.get('/api/v1/documents/lifecycle/:employeeId', verifyUser, getLifecycle);
router.get('/api/v1/documents/validate/:employeeId', verifyUser, validateDocumentForEmployee);

// Generate A4 PDF
router.post(
    '/documents/generate',
    verifyUser,
    express.urlencoded({ extended: true }),
    generateDocument
);

export default router;
