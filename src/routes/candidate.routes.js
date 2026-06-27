import express from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';
import {
  renderCandidatesPage,
  apiListCandidates,
  apiGetCandidate,
  apiCreateCandidate,
  apiUpdateCandidate,
  apiDeleteCandidate,
  apiConvertCandidate,
  apiListManagersForConvert,
} from '../controllers/candidate.controller.js';

const router = express.Router();

router.get('/candidates', verifyUser, renderCandidatesPage);
router.get('/api/v1/candidates', verifyUser, apiListCandidates);
router.get('/api/v1/candidates/managers', verifyUser, apiListManagersForConvert);
router.get('/api/v1/candidates/:id', verifyUser, apiGetCandidate);
router.post('/api/v1/candidates', verifyUser, apiCreateCandidate);
router.put('/api/v1/candidates/:id', verifyUser, apiUpdateCandidate);
router.delete('/api/v1/candidates/:id', verifyUser, apiDeleteCandidate);
router.post('/api/v1/candidates/:id/convert', verifyUser, apiConvertCandidate);

export default router;
