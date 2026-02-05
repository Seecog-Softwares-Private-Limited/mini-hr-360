// src/controllers/admin/payroll/payrollApproval.controller.js
// Controller for payroll approval workflow

import { asyncHandler } from '../../../utils/asyncHandler.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { ApiError } from '../../../utils/ApiError.js';
import * as payrollApprovalService from '../../../services/payroll/payrollApproval.service.js';
import { getRolePermissions, getApprovalStep } from '../../../middleware/roleMiddleware.js';

/**
 * Initialize approval workflow for a payroll run
 * POST /api/v1/admin/payroll/runs/:id/workflow/initialize
 */
export const initializeWorkflow = asyncHandler(async (req, res) => {
    const payrollRunId = Number(req.params.id);
    const businessId = req.body.businessId || req.user?.businessId;
    const options = {
        autoApproveAfterDays: req.body.autoApproveAfterDays || 3,
    };

    if (!businessId) {
        throw new ApiError(400, 'Business ID is required');
    }

    try {
        const approvals = await payrollApprovalService.initializeWorkflow(payrollRunId, businessId, options);
        return res.json(new ApiResponse(201, approvals, 'Approval workflow initialized'));
    } catch (err) {
        throw new ApiError(400, err.message);
    }
});

/**
 * Get workflow status for a payroll run
 * GET /api/v1/admin/payroll/runs/:id/workflow/status
 */
export const getWorkflowStatus = asyncHandler(async (req, res) => {
    const payrollRunId = Number(req.params.id);

    try {
        const status = await payrollApprovalService.getWorkflowStatus(payrollRunId);
        return res.json(new ApiResponse(200, status));
    } catch (err) {
        throw new ApiError(400, err.message);
    }
});

/**
 * Submit approval for current step
 * POST /api/v1/admin/payroll/runs/:id/workflow/approve
 */
export const submitApproval = asyncHandler(async (req, res) => {
    const payrollRunId = Number(req.params.id);
    const userId = req.user?.id;
    const { action = 'approve', comments = null } = req.body;

    if (!userId) {
        throw new ApiError(401, 'User must be authenticated');
    }

    if (!['approve', 'reject'].includes(action)) {
        throw new ApiError(400, 'Action must be "approve" or "reject"');
    }

    try {
        const result = await payrollApprovalService.submitApproval({
            payrollRunId,
            userId,
            action,
            comments,
        });
        return res.json(new ApiResponse(200, result, `Approval ${action}d successfully`));
    } catch (err) {
        throw new ApiError(400, err.message);
    }
});

/**
 * Skip an approval step (admin only)
 * POST /api/v1/admin/payroll/runs/:id/workflow/skip
 */
export const skipStep = asyncHandler(async (req, res) => {
    const payrollRunId = Number(req.params.id);
    const userId = req.user?.id;
    const { step, reason } = req.body;

    if (!step) {
        throw new ApiError(400, 'Step number is required');
    }

    try {
        const result = await payrollApprovalService.skipApprovalStep({
            payrollRunId,
            step: Number(step),
            userId,
            reason,
        });
        return res.json(new ApiResponse(200, result, 'Step skipped'));
    } catch (err) {
        throw new ApiError(400, err.message);
    }
});

/**
 * Reset workflow (after rejection, for resubmission)
 * POST /api/v1/admin/payroll/runs/:id/workflow/reset
 */
export const resetWorkflow = asyncHandler(async (req, res) => {
    const payrollRunId = Number(req.params.id);

    try {
        await payrollApprovalService.resetWorkflow(payrollRunId);
        return res.json(new ApiResponse(200, { payrollRunId }, 'Workflow reset'));
    } catch (err) {
        throw new ApiError(400, err.message);
    }
});

/**
 * Get workflow history/audit trail
 * GET /api/v1/admin/payroll/runs/:id/workflow/history
 */
export const getWorkflowHistory = asyncHandler(async (req, res) => {
    const payrollRunId = Number(req.params.id);

    try {
        const history = await payrollApprovalService.getWorkflowHistory(payrollRunId);
        return res.json(new ApiResponse(200, history));
    } catch (err) {
        throw new ApiError(400, err.message);
    }
});

/**
 * Get pending approvals for the current user
 * GET /api/v1/admin/payroll/approvals/pending
 */
export const getPendingApprovals = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const businessId = req.query.businessId || req.user?.businessId || null;

    if (!userId) {
        throw new ApiError(401, 'User must be authenticated');
    }

    try {
        const approvals = await payrollApprovalService.getPendingApprovalsForUser(userId, businessId);
        return res.json(new ApiResponse(200, approvals));
    } catch (err) {
        throw new ApiError(400, err.message);
    }
});

/**
 * Get approval step configuration
 * GET /api/v1/admin/payroll/workflow/steps
 */
export const getApprovalSteps = asyncHandler(async (req, res) => {
    return res.json(new ApiResponse(200, payrollApprovalService.APPROVAL_STEPS));
});

/**
 * Get user's role permissions and approval capabilities
 * GET /api/v1/admin/payroll/workflow/permissions
 */
export const getUserPermissions = asyncHandler(async (req, res) => {
    const userRole = req.user?.role;
    const permissions = getRolePermissions(userRole);
    const approvalStep = getApprovalStep(userRole);

    return res.json(new ApiResponse(200, {
        role: userRole,
        permissions,
        approvalStep,
        canApprove: permissions.canApprovePayroll,
        canFinalApprove: permissions.canFinalApprovePayroll,
    }));
});

export default {
    initializeWorkflow,
    getWorkflowStatus,
    submitApproval,
    skipStep,
    resetWorkflow,
    getWorkflowHistory,
    getPendingApprovals,
    getApprovalSteps,
    getUserPermissions,
};
