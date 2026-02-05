// src/services/payroll/payrollApproval.service.js
// Service for handling payroll approval workflow

import { sequelize } from '../../db/index.js';
import { Op } from 'sequelize';
import { PayrollRun, PayrollApproval, User, Business, Notification } from '../../models/index.js';
import { getApprovalStep } from '../../middleware/roleMiddleware.js';

/**
 * Approval workflow steps configuration
 * Note: Only HR and Finance approvals are required now.
 * After both approve, Lock and Publish are unlocked for Admin.
 */
export const APPROVAL_STEPS = [
    { step: 1, name: 'HR_REVIEW', label: 'HR Approval', description: 'Data validation and approval by HR', requiredRoles: ['HR_MANAGER', 'HR_EXECUTIVE'] },
    { step: 2, name: 'FINANCE_REVIEW', label: 'Finance Approval', description: 'Budget check and approval by Finance', requiredRoles: ['FINANCE'] },
];

/**
 * Initialize approval workflow for a payroll run
 * Creates pending approval records for each step
 */
export const initializeWorkflow = async (payrollRunId, businessId, options = {}) => {
    const { autoApproveAfterDays = null } = options;
    
    return sequelize.transaction(async (t) => {
        // Check if workflow already exists
        const existing = await PayrollApproval.findOne({
            where: { payrollRunId },
            transaction: t,
        });
        
        if (existing) {
            // Return existing workflow status instead of throwing error
            const approvals = await PayrollApproval.findAll({
                where: { payrollRunId },
                order: [['step', 'ASC']],
                transaction: t,
            });
            return approvals;
        }
        
        // Create approval records for each step
        const approvals = [];
        for (const stepConfig of APPROVAL_STEPS) {
            const deadline = autoApproveAfterDays
                ? new Date(Date.now() + autoApproveAfterDays * 24 * 60 * 60 * 1000)
                : null;
            
            // First step starts as PENDING, others as WAITING
            const initialStatus = stepConfig.step === 1 ? 'PENDING' : 'WAITING';
            
            const approval = await PayrollApproval.create({
                payrollRunId,
                businessId,
                step: stepConfig.step,
                stepName: stepConfig.name,
                status: initialStatus,
                requiredRole: stepConfig.requiredRoles[0], // Primary required role
                deadline,
                autoApprove: !!autoApproveAfterDays,
            }, { transaction: t });
            
            approvals.push(approval);
        }
        
        // Update payroll run status
        await PayrollRun.update(
            { status: 'Pending Approval' },
            { where: { id: payrollRunId }, transaction: t }
        );
        
        // Create notifications for HR users (first step)
        await createApprovalNotifications(payrollRunId, businessId, 1, t);
        
        return approvals;
    });
};

/**
 * Get current workflow status for a payroll run
 */
export const getWorkflowStatus = async (payrollRunId) => {
    const approvals = await PayrollApproval.findAll({
        where: { payrollRunId },
        include: [
            { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
            { model: User, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
        ],
        order: [['step', 'ASC']],
    });
    
    if (!approvals.length) {
        return { initialized: false, steps: [], hrApproved: false, financeApproved: false, allApproved: false };
    }
    
    const currentStep = approvals.find(a => a.status === 'PENDING')?.step || null;
    const isComplete = approvals.every(a => a.status === 'APPROVED' || a.status === 'SKIPPED');
    const isRejected = approvals.some(a => a.status === 'REJECTED');
    
    // Check individual approvals
    const hrApproval = approvals.find(a => a.stepName === 'HR_REVIEW');
    const financeApproval = approvals.find(a => a.stepName === 'FINANCE_REVIEW');
    
    const hrApproved = hrApproval?.status === 'APPROVED' || hrApproval?.status === 'SKIPPED';
    const financeApproved = financeApproval?.status === 'APPROVED' || financeApproval?.status === 'SKIPPED';
    
    return {
        initialized: true,
        currentStep,
        isComplete,
        isRejected,
        hrApproved,
        financeApproved,
        allApproved: hrApproved && financeApproved,
        hrStatus: hrApproval?.status || 'WAITING',
        financeStatus: financeApproval?.status || 'WAITING',
        hrApprover: hrApproval?.approver || null,
        financeApprover: financeApproval?.approver || null,
        hrComments: hrApproval?.comments || null,
        financeComments: financeApproval?.comments || null,
        hrActionAt: hrApproval?.actionAt || null,
        financeActionAt: financeApproval?.actionAt || null,
        steps: approvals.map(a => ({
            step: a.step,
            stepName: a.stepName,
            status: a.status,
            approver: a.approver,
            assignedTo: a.assignedTo,
            comments: a.comments,
            actionAt: a.actionAt,
            deadline: a.deadline,
            autoApprove: a.autoApprove,
        })),
    };
};

/**
 * Submit approval for a step
 */
export const submitApproval = async ({ payrollRunId, userId, action, comments = null }) => {
    return sequelize.transaction(async (t) => {
        // Get user and their role
        const user = await User.findByPk(userId);
        if (!user) throw new Error('User not found');
        
        const userApprovalStep = getApprovalStep(user.role);
        const isAdmin = ['admin', 'SUPER_ADMIN', 'shop_owner'].includes(user.role);
        
        // Find the current pending step for this payroll
        const currentApproval = await PayrollApproval.findOne({
            where: {
                payrollRunId,
                status: 'PENDING',
            },
            order: [['step', 'ASC']],
            transaction: t,
        });
        
        if (!currentApproval) {
            throw new Error('No pending approval steps found');
        }
        
        // Verify user can approve this step
        const stepConfig = APPROVAL_STEPS.find(s => s.step === currentApproval.step);
        const canApprove = stepConfig.requiredRoles.includes(user.role) || isAdmin;
        
        if (!canApprove) {
            throw new Error(`User role ${user.role} cannot approve step ${currentApproval.step} (${currentApproval.stepName})`);
        }
        
        // Update the approval record
        const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
        await currentApproval.update({
            status: newStatus,
            approverId: userId,
            comments,
            actionAt: new Date(),
        }, { transaction: t });
        
        const payrollRun = await PayrollRun.findByPk(payrollRunId, { transaction: t });
        
        if (action === 'reject') {
            // If rejected, update payroll run status back to Processing so admin can fix
            await payrollRun.update({ status: 'Processing' }, { transaction: t });
            
            // Reset any remaining steps to WAITING
            await PayrollApproval.update(
                { status: 'WAITING', approverId: null, comments: null, actionAt: null },
                { where: { payrollRunId, step: { [Op.gt]: currentApproval.step } }, transaction: t }
            );
            
            // Notify the admins about rejection
            const admins = await User.findAll({
                where: { role: { [Op.in]: ['admin', 'SUPER_ADMIN', 'shop_owner'] }, status: 'active' },
                transaction: t,
            });
            
            for (const admin of admins) {
                await Notification.create({
                    userId: admin.id,
                    businessId: payrollRun.businessId,
                    type: 'PAYROLL_REJECTED',
                    title: `Payroll Rejected by ${stepConfig.label}`,
                    message: `Payroll for ${getMonthName(payrollRun.periodMonth)} ${payrollRun.periodYear} was rejected at ${stepConfig.label} by ${user.firstName} ${user.lastName}. Reason: ${comments || 'No reason provided'}`,
                    priority: 'HIGH',
                    link: `/admin/payroll/runs`,
                    entityType: 'PayrollRun',
                    entityId: payrollRunId,
                }, { transaction: t });
            }
            
            return { success: true, action: 'rejected', step: currentApproval.step, stepName: currentApproval.stepName };
        }
        
        // Check if there are more steps
        const nextStep = currentApproval.step + 1;
        const nextStepConfig = APPROVAL_STEPS.find(s => s.step === nextStep);
        
        if (nextStepConfig) {
            // Move next step from WAITING to PENDING
            await PayrollApproval.update(
                { status: 'PENDING' },
                { where: { payrollRunId, step: nextStep }, transaction: t }
            );
            
            // Notify next approvers
            await createApprovalNotifications(payrollRunId, payrollRun.businessId, nextStep, t);
            
            // Notify admins about progress
            const admins = await User.findAll({
                where: { role: { [Op.in]: ['admin', 'SUPER_ADMIN', 'shop_owner'] }, status: 'active' },
                transaction: t,
            });
            
            for (const admin of admins) {
                await Notification.create({
                    userId: admin.id,
                    businessId: payrollRun.businessId,
                    type: 'PAYROLL_APPROVED',
                    title: `${stepConfig.label} Complete`,
                    message: `Payroll for ${getMonthName(payrollRun.periodMonth)} ${payrollRun.periodYear}: ${stepConfig.label} done by ${user.firstName} ${user.lastName}. Now awaiting ${nextStepConfig.label}.`,
                    priority: 'MEDIUM',
                    link: `/admin/payroll/runs`,
                    entityType: 'PayrollRun',
                    entityId: payrollRunId,
                }, { transaction: t });
            }
            
            return { success: true, action: 'approved', step: currentApproval.step, stepName: currentApproval.stepName, nextStep, nextStepName: nextStepConfig.name };
        } else {
            // All steps complete - approve the payroll run (set to Approved status)
            await payrollRun.update({ status: 'Approved' }, { transaction: t });
            
            // Notify admins that all approvals are done
            const admins = await User.findAll({
                where: { role: { [Op.in]: ['admin', 'SUPER_ADMIN', 'shop_owner'] }, status: 'active' },
                transaction: t,
            });
            
            for (const admin of admins) {
                await Notification.create({
                    userId: admin.id,
                    businessId: payrollRun.businessId,
                    type: 'PAYROLL_APPROVED',
                    title: 'All Approvals Complete',
                    message: `Payroll for ${getMonthName(payrollRun.periodMonth)} ${payrollRun.periodYear} has been fully approved by HR and Finance. Ready to Lock and Publish.`,
                    priority: 'HIGH',
                    link: `/admin/payroll/runs`,
                    entityType: 'PayrollRun',
                    entityId: payrollRunId,
                }, { transaction: t });
            }
            
            return { success: true, action: 'fully_approved', step: currentApproval.step, stepName: currentApproval.stepName };
        }
    });
};

/**
 * Get pending approvals for a user based on their role
 */
export const getPendingApprovalsForUser = async (userId, businessId = null) => {
    const user = await User.findByPk(userId);
    if (!user) return [];
    
    const userApprovalStep = getApprovalStep(user.role);
    const isAdmin = ['admin', 'SUPER_ADMIN', 'shop_owner'].includes(user.role);
    
    // Build query conditions
    const where = {
        status: 'PENDING',
    };
    
    if (businessId) {
        where.businessId = businessId;
    }
    
    // Non-admins can only see approvals for their step
    if (!isAdmin && userApprovalStep) {
        where.step = userApprovalStep;
    }
    
    const approvals = await PayrollApproval.findAll({
        where,
        include: [
            {
                model: PayrollRun,
                as: 'payrollRun',
                attributes: ['id', 'periodMonth', 'periodYear', 'status', 'totalNetPay', 'employeeCount'],
            },
            {
                model: Business,
                as: 'business',
                attributes: ['id', 'businessName'],
            },
        ],
        order: [['createdAt', 'ASC']],
    });
    
    // Filter by required roles if not admin
    if (!isAdmin) {
        return approvals.filter(a => {
            const stepConfig = APPROVAL_STEPS.find(s => s.step === a.step);
            return stepConfig?.requiredRoles.includes(user.role);
        });
    }
    
    return approvals;
};

/**
 * Create notifications for users who can approve a specific step
 */
async function createApprovalNotifications(payrollRunId, businessId, step, transaction) {
    const stepConfig = APPROVAL_STEPS.find(s => s.step === step);
    if (!stepConfig) return;
    
    const payrollRun = await PayrollRun.findByPk(payrollRunId, { transaction });
    
    // Find users with matching roles
    const users = await User.findAll({
        where: {
            role: { [Op.in]: stepConfig.requiredRoles },
            status: 'active',
        },
        transaction,
    });
    
    // Also notify admins
    const admins = await User.findAll({
        where: {
            role: { [Op.in]: ['admin', 'SUPER_ADMIN', 'shop_owner'] },
            status: 'active',
        },
        transaction,
    });
    
    const allUsers = [...users, ...admins];
    const uniqueUserIds = [...new Set(allUsers.map(u => u.id))];
    
    for (const userId of uniqueUserIds) {
        await Notification.create({
            userId,
            businessId,
            type: 'PAYROLL_PENDING_APPROVAL',
            title: `Payroll Pending ${stepConfig.label}`,
            message: `Payroll for ${getMonthName(payrollRun.periodMonth)} ${payrollRun.periodYear} requires ${stepConfig.label}. Total Net Pay: ₹${payrollRun.totalNetPay?.toLocaleString() || 0}`,
            priority: 'HIGH',
            link: `/admin/payroll/runs`,
            entityType: 'PayrollRun',
            entityId: payrollRunId,
            metadata: {
                step,
                stepName: stepConfig.name,
                periodMonth: payrollRun.periodMonth,
                periodYear: payrollRun.periodYear,
            },
        }, { transaction });
    }
}

/**
 * Skip a step (for admin override)
 */
export const skipApprovalStep = async ({ payrollRunId, step, userId, reason }) => {
    return sequelize.transaction(async (t) => {
        const user = await User.findByPk(userId);
        if (!['admin', 'SUPER_ADMIN', 'shop_owner'].includes(user?.role)) {
            throw new Error('Only admins can skip approval steps');
        }
        
        const approval = await PayrollApproval.findOne({
            where: { payrollRunId, step },
            transaction: t,
        });
        
        if (!approval) throw new Error('Approval step not found');
        if (approval.status !== 'PENDING') throw new Error('Only pending steps can be skipped');
        
        await approval.update({
            status: 'SKIPPED',
            approverId: userId,
            comments: `Skipped by admin. Reason: ${reason || 'No reason provided'}`,
            actionAt: new Date(),
        }, { transaction: t });
        
        // Check if workflow is complete
        const remaining = await PayrollApproval.count({
            where: { payrollRunId, status: 'PENDING' },
            transaction: t,
        });
        
        if (remaining === 0) {
            await PayrollRun.update(
                { status: 'Approved' },
                { where: { id: payrollRunId }, transaction: t }
            );
        }
        
        return approval;
    });
};

/**
 * Reset workflow (for resubmission after rejection)
 */
export const resetWorkflow = async (payrollRunId) => {
    return sequelize.transaction(async (t) => {
        await PayrollApproval.update(
            { status: 'PENDING', approverId: null, comments: null, actionAt: null },
            { where: { payrollRunId }, transaction: t }
        );
        
        await PayrollRun.update(
            { status: 'Pending Approval' },
            { where: { id: payrollRunId }, transaction: t }
        );
        
        return true;
    });
};

/**
 * Get workflow history/audit trail
 */
export const getWorkflowHistory = async (payrollRunId) => {
    return PayrollApproval.findAll({
        where: { payrollRunId },
        include: [
            { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
        ],
        order: [['step', 'ASC']],
    });
};

// Helper function
function getMonthName(month) {
    const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month] || '';
}

export default {
    APPROVAL_STEPS,
    initializeWorkflow,
    getWorkflowStatus,
    submitApproval,
    getPendingApprovalsForUser,
    skipApprovalStep,
    resetWorkflow,
    getWorkflowHistory,
};
