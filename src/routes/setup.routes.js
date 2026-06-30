import { Router } from 'express';
import multer from 'multer';
import { verifyUser } from '../middleware/authMiddleware.js';
import { attachWorkspaceContext } from '../middleware/workspaceMiddleware.js';
import { requireSetupView, requireSetupEdit } from '../middleware/setupAuthMiddleware.js';
import {
  getSetupStatusHandler,
  getCompanyDetails,
  updateCompanyDetails,
  uploadCompanyLogo,
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getDepartmentsDesignations,
  saveDepartmentsDesignations,
  getLeavePolicies,
  saveLeavePolicies,
  getAttendanceRules,
  updateAttendanceRules,
  inviteEmployees,
  inviteEmployeesCsv,
  downloadSampleCsv,
  skipSetupStep,
  completeSetupStep,
  finishSetupHandler,
} from '../controllers/setup.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(verifyUser);
router.use(attachWorkspaceContext);

// View routes (Owner/Admin/HR Manager)
router.get('/status', requireSetupView, getSetupStatusHandler);
router.get('/company-details', requireSetupView, getCompanyDetails);
router.get('/branches', requireSetupView, listBranches);
router.get('/departments-designations', requireSetupView, getDepartmentsDesignations);
router.get('/leave-policies', requireSetupView, getLeavePolicies);
router.get('/attendance-rules', requireSetupView, getAttendanceRules);
router.get('/invite-employees/sample-csv', requireSetupView, downloadSampleCsv);

// Edit routes (Owner/Admin only)
router.put('/company-details', requireSetupEdit, updateCompanyDetails);
router.post('/company-details/logo', requireSetupEdit, upload.single('logo'), uploadCompanyLogo);
router.post('/branches', requireSetupEdit, createBranch);
router.put('/branches/:id', requireSetupEdit, updateBranch);
router.delete('/branches/:id', requireSetupEdit, deleteBranch);
router.post('/departments-designations', requireSetupEdit, saveDepartmentsDesignations);
router.post('/leave-policies', requireSetupEdit, saveLeavePolicies);
router.put('/attendance-rules', requireSetupEdit, updateAttendanceRules);
router.post('/invite-employees', requireSetupEdit, inviteEmployees);
router.post('/invite-employees/csv', requireSetupEdit, upload.single('file'), inviteEmployeesCsv);
router.post('/skip-step', requireSetupEdit, skipSetupStep);
router.post('/complete-step', requireSetupEdit, completeSetupStep);
router.post('/finish', requireSetupEdit, finishSetupHandler);

export default router;
