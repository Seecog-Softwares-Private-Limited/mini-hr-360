// src/routes/employee.routes.js
import express from 'express';
import {
    renderEmployeesPage,
    listEmployees,
    createEmployee,
    getEmployeeById,
    updateEmployee,
    updateEmployeeStatus,
    deleteEmployee,
    resetEmployeePortalAccess,
    sendEmployeePortalCredentials,
    sendEmployeePortalCredentialsEmail,
    uploadEducationCertificate,
    uploadExperienceDocument,
    uploadEmployeeDocument,
    downloadBulkImportTemplate,
    bulkImportEmployees,
    renderEmployeeProfilePage,
    getEmployeeProfile,
    getEmployeeLifecycleChecklist,
    getEmployeeTimeline,
    getEmployeeProfileTab,
    getEmployeeBankDetailsApi,
    putEmployeeBankDetailsApi,
    putEmployeeProfileSalaryApi,
    postEmployeeJobChangeApi,
    getEmployeeJobChangeHistoryApi,
    getEmployeeAssetsApi,
    postEmployeeAssetApi,
    patchEmployeeAssetReturnApi,
} from '../controllers/employee.controllers.js';
import {
    getLifecycle,
    patchLifecycleStage,
    postInitiateExit,
    postCompleteExit,
    postApplyIncrementCtc,
    postConvertIntern,
    patchOffboardingChecklist,
    postSyncPayroll,
    postAcceptOffer,
    postConfirmEmployment,
    getDocumentVersionHistory,
} from '../controllers/lifecycle.controller.js';
import { verifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// HTML page
router.get('/employees', verifyUser, renderEmployeesPage);
router.get('/employees/:id', verifyUser, renderEmployeeProfilePage);

// JSON APIs
router.get('/api/v1/employees', verifyUser, listEmployees);
router.post('/api/v1/employees', verifyUser, createEmployee);
router.get('/api/v1/employees/bulk-import/template', verifyUser, downloadBulkImportTemplate);
router.post('/api/v1/employees/bulk-import', verifyUser, express.json(), bulkImportEmployees);
router.post('/api/v1/employees/education-certificate/upload', verifyUser, uploadEducationCertificate);
router.post('/api/v1/employees/experience-document/upload', verifyUser, uploadExperienceDocument);
router.post('/api/v1/employees/document/upload', verifyUser, uploadEmployeeDocument);
router.get('/api/v1/employees/:id/profile', verifyUser, getEmployeeProfile);
router.get('/api/v1/employees/:id/lifecycle-checklist', verifyUser, getEmployeeLifecycleChecklist);
router.get('/api/v1/employees/:id/timeline', verifyUser, getEmployeeTimeline);
router.get('/api/v1/employees/:id/profile/tab/:tab', verifyUser, getEmployeeProfileTab);
router.get('/api/v1/employees/:id/bank-details', verifyUser, getEmployeeBankDetailsApi);
router.put('/api/v1/employees/:id/bank-details', verifyUser, express.json(), putEmployeeBankDetailsApi);
router.put('/api/v1/employees/:id/profile/salary', verifyUser, express.json(), putEmployeeProfileSalaryApi);
router.post('/api/v1/employees/:id/job-change', verifyUser, express.json(), postEmployeeJobChangeApi);
router.get('/api/v1/employees/:id/job-change/history', verifyUser, getEmployeeJobChangeHistoryApi);
router.get('/api/v1/employees/:id/assets', verifyUser, getEmployeeAssetsApi);
router.post('/api/v1/employees/:id/assets', verifyUser, express.json(), postEmployeeAssetApi);
router.patch('/api/v1/employees/:id/assets/:assetId/return', verifyUser, express.json(), patchEmployeeAssetReturnApi);
router.get('/api/v1/employees/:id', verifyUser, getEmployeeById);
router.put('/api/v1/employees/:id', verifyUser, updateEmployee);
router.patch('/api/v1/employees/:id/status', verifyUser, updateEmployeeStatus);
router.post('/api/v1/employees/:id/portal-access/reset', verifyUser, resetEmployeePortalAccess);
router.post('/api/v1/employees/:id/portal-access/send', verifyUser, sendEmployeePortalCredentials);
router.post('/api/v1/employees/:id/portal-access/send-email', verifyUser, sendEmployeePortalCredentialsEmail);
router.delete('/api/v1/employees/:id', verifyUser, deleteEmployee);

// Employee lifecycle workflow
router.get('/api/v1/employees/:id/lifecycle', verifyUser, getLifecycle);
router.patch('/api/v1/employees/:id/lifecycle-stage', verifyUser, patchLifecycleStage);
router.post('/api/v1/employees/:id/lifecycle/exit/initiate', verifyUser, postInitiateExit);
router.post('/api/v1/employees/:id/lifecycle/exit/complete', verifyUser, postCompleteExit);
router.post('/api/v1/employees/:id/lifecycle/increment/apply-ctc', verifyUser, postApplyIncrementCtc);
router.post('/api/v1/employees/:id/lifecycle/convert-intern', verifyUser, postConvertIntern);
router.patch('/api/v1/employees/:id/lifecycle/offboarding-checklist', verifyUser, patchOffboardingChecklist);
router.post('/api/v1/employees/:id/lifecycle/sync-payroll', verifyUser, postSyncPayroll);
router.post('/api/v1/employees/:id/lifecycle/offer/accept', verifyUser, express.json(), postAcceptOffer);
router.post('/api/v1/employees/:id/lifecycle/confirm', verifyUser, express.json(), postConfirmEmployment);
router.get('/api/v1/employees/:id/generated-documents/versions', verifyUser, getDocumentVersionHistory);

export default router;
