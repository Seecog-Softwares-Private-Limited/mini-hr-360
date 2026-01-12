// src/routes/adminLeave.routes.js
import { Router } from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';
import {
  renderLeaveRequests,
  renderLeaveTypes,
  renderLeaveBalances,
  approveRequest,
  rejectRequest,
  createLeaveType,
  getLeaveType,
  updateLeaveType,
  deleteLeaveType,
} from '../controllers/admin/adminLeave.controller.js';

const router = Router();

// All routes require admin authentication
router.use(verifyUser);

// Page routes (mounted at root level)
router.get('/', renderLeaveRequests);
router.get('/leave-types', renderLeaveTypes);
router.get('/leave-balances', renderLeaveBalances);

// Leave Request action routes
router.post('/:id/approve', approveRequest);
router.post('/:id/reject', rejectRequest);

// Leave Type CRUD routes
router.post('/leave-types/create', createLeaveType);
router.get('/leave-types/:id', getLeaveType);
router.put('/leave-types/:id', updateLeaveType);
router.delete('/leave-types/:id', deleteLeaveType);

export default router;
export { router as adminLeaveRouter };
