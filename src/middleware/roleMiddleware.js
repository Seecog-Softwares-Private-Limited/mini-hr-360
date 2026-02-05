// src/middleware/roleMiddleware.js
// Role-based access control middleware for different user roles
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Role definitions and their access permissions
 * 
 * ADMIN / SUPER_ADMIN: Full access to all features
 * HR_MANAGER / HR_EXECUTIVE: Access to HR-related features (employees, leaves, attendance, payroll review)
 * FINANCE: Access to finance-related features (payroll, billing, statutory reports)
 * MANAGER: Limited access (team management, leave approvals for their team)
 * EMPLOYEE: Employee portal access only
 */

// Define role hierarchies and permissions
export const ROLE_PERMISSIONS = {
    // Admin roles - full access
    admin: {
        canAccessPayroll: true,
        canApprovePayroll: true,
        canFinalApprovePayroll: true,
        canAccessHR: true,
        canAccessFinance: true,
        canAccessEmployees: true,
        canAccessLeaves: true,
        canAccessAttendance: true,
        canAccessDocuments: true,
        canAccessBilling: true,
        canAccessSettings: true,
        approvalStep: 3, // Final approval
        dashboardType: 'admin',
    },
    SUPER_ADMIN: {
        canAccessPayroll: true,
        canApprovePayroll: true,
        canFinalApprovePayroll: true,
        canAccessHR: true,
        canAccessFinance: true,
        canAccessEmployees: true,
        canAccessLeaves: true,
        canAccessAttendance: true,
        canAccessDocuments: true,
        canAccessBilling: true,
        canAccessSettings: true,
        approvalStep: 3, // Final approval
        dashboardType: 'admin',
    },
    // HR roles - HR-related access + payroll review (step 1)
    HR_MANAGER: {
        canAccessPayroll: true,
        canApprovePayroll: true,
        canFinalApprovePayroll: false,
        canAccessHR: true,
        canAccessFinance: false,
        canAccessEmployees: true,
        canAccessLeaves: true,
        canAccessAttendance: true,
        canAccessDocuments: true,
        canAccessBilling: false,
        canAccessSettings: false,
        approvalStep: 1, // HR Review
        dashboardType: 'hr',
    },
    HR_EXECUTIVE: {
        canAccessPayroll: true,
        canApprovePayroll: true,
        canFinalApprovePayroll: false,
        canAccessHR: true,
        canAccessFinance: false,
        canAccessEmployees: true,
        canAccessLeaves: true,
        canAccessAttendance: true,
        canAccessDocuments: true,
        canAccessBilling: false,
        canAccessSettings: false,
        approvalStep: 1, // HR Review
        dashboardType: 'hr',
    },
    // Finance role - Finance-related access + payroll review (step 2)
    FINANCE: {
        canAccessPayroll: true,
        canApprovePayroll: true,
        canFinalApprovePayroll: false,
        canAccessHR: false,
        canAccessFinance: true,
        canAccessEmployees: false,
        canAccessLeaves: false,
        canAccessAttendance: false,
        canAccessDocuments: false,
        canAccessBilling: true,
        canAccessSettings: false,
        approvalStep: 2, // Finance Review
        dashboardType: 'finance',
    },
    // Manager role - limited access
    MANAGER: {
        canAccessPayroll: false,
        canApprovePayroll: false,
        canFinalApprovePayroll: false,
        canAccessHR: false,
        canAccessFinance: false,
        canAccessEmployees: false,
        canAccessLeaves: true,
        canAccessAttendance: true,
        canAccessDocuments: false,
        canAccessBilling: false,
        canAccessSettings: false,
        approvalStep: null,
        dashboardType: 'manager',
    },
    // Default/legacy roles
    shop_owner: {
        canAccessPayroll: true,
        canApprovePayroll: true,
        canFinalApprovePayroll: true,
        canAccessHR: true,
        canAccessFinance: true,
        canAccessEmployees: true,
        canAccessLeaves: true,
        canAccessAttendance: true,
        canAccessDocuments: true,
        canAccessBilling: true,
        canAccessSettings: true,
        approvalStep: 3,
        dashboardType: 'admin',
    },
};

/**
 * Get role permissions for a user
 */
export const getRolePermissions = (role) => {
    const normalizedRole = role || 'shop_owner';
    return ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.shop_owner;
};

/**
 * Check if user has a specific permission
 */
export const hasPermission = (user, permission) => {
    const permissions = getRolePermissions(user?.role);
    return permissions[permission] === true;
};

/**
 * Get the approval step number for a role
 */
export const getApprovalStep = (role) => {
    const permissions = getRolePermissions(role);
    return permissions.approvalStep;
};

/**
 * Middleware to check if user can access payroll features
 */
export const canAccessPayroll = asyncHandler(async (req, res, next) => {
    const permissions = getRolePermissions(req.user?.role);
    
    if (!permissions.canAccessPayroll) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
            error: 'You do not have permission to access payroll features',
        });
    }
    
    req.userPermissions = permissions;
    next();
});

/**
 * Middleware to check if user can approve payroll
 */
export const canApprovePayroll = asyncHandler(async (req, res, next) => {
    const permissions = getRolePermissions(req.user?.role);
    
    if (!permissions.canApprovePayroll) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
            error: 'You do not have permission to approve payroll',
        });
    }
    
    req.userPermissions = permissions;
    next();
});

/**
 * Middleware to check if user can give final payroll approval
 */
export const canFinalApprovePayroll = asyncHandler(async (req, res, next) => {
    const permissions = getRolePermissions(req.user?.role);
    
    if (!permissions.canFinalApprovePayroll) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
            error: 'You do not have permission for final payroll approval',
        });
    }
    
    req.userPermissions = permissions;
    next();
});

/**
 * Generic middleware factory to check specific permissions
 */
export const requirePermission = (permissionName) => {
    return asyncHandler(async (req, res, next) => {
        const permissions = getRolePermissions(req.user?.role);
        
        if (!permissions[permissionName]) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
                error: `You do not have the required permission: ${permissionName}`,
            });
        }
        
        req.userPermissions = permissions;
        next();
    });
};

/**
 * Middleware to require one of several roles
 */
export const requireRoles = (...roles) => {
    return asyncHandler(async (req, res, next) => {
        const userRole = req.user?.role;
        
        if (!roles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
                error: `This action requires one of these roles: ${roles.join(', ')}`,
            });
        }
        
        req.userPermissions = getRolePermissions(userRole);
        next();
    });
};

/**
 * Get sidebar items based on user role
 */
export const getSidebarItemsForRole = (role) => {
    const permissions = getRolePermissions(role);
    
    return {
        dashboard: true, // Everyone can see dashboard
        business: permissions.canAccessSettings,
        employees: permissions.canAccessEmployees,
        leaves: permissions.canAccessLeaves,
        attendance: permissions.canAccessAttendance,
        payroll: permissions.canAccessPayroll,
        documents: permissions.canAccessDocuments,
        billing: permissions.canAccessBilling,
        settings: permissions.canAccessSettings,
    };
};

export default {
    ROLE_PERMISSIONS,
    getRolePermissions,
    hasPermission,
    getApprovalStep,
    canAccessPayroll,
    canApprovePayroll,
    canFinalApprovePayroll,
    requirePermission,
    requireRoles,
    getSidebarItemsForRole,
};
