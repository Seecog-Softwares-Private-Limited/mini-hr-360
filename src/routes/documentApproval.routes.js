import express from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';
import {
  renderDocumentApprovalsPage,
  apiListApprovals,
  apiGetApproval,
  apiApproveDocument,
  apiRejectDocument,
  apiPreviewPendingPdf,
  apiPendingApprovalsCount,
} from '../controllers/documentApproval.controller.js';

const router = express.Router();

router.get('/document-approvals', verifyUser, renderDocumentApprovalsPage);
router.get('/api/v1/document-approvals', verifyUser, apiListApprovals);
router.get('/api/v1/document-approvals/count', verifyUser, apiPendingApprovalsCount);
router.get('/api/v1/document-approvals/:id', verifyUser, apiGetApproval);
router.get('/api/v1/document-approvals/:id/preview', verifyUser, apiPreviewPendingPdf);
router.post('/api/v1/document-approvals/:id/approve', verifyUser, apiApproveDocument);
router.post('/api/v1/document-approvals/:id/reject', verifyUser, apiRejectDocument);

export default router;
