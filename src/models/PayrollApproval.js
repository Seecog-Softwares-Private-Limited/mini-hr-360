// src/models/PayrollApproval.js
// Model for tracking payroll approval workflow steps
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

const PayrollApproval = sequelize.define(
    'PayrollApproval',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        payrollRunId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'payroll_runs',
                key: 'id',
            },
        },
        businessId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'businesses',
                key: 'id',
            },
        },
        // Approval step: 1 = HR Review, 2 = Finance Review
        step: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1,
                max: 2,
            },
        },
        stepName: {
            type: DataTypes.ENUM('HR_REVIEW', 'FINANCE_REVIEW'),
            allowNull: false,
        },
        // Status of this approval step
        status: {
            type: DataTypes.ENUM('WAITING', 'PENDING', 'APPROVED', 'REJECTED', 'SKIPPED'),
            defaultValue: 'WAITING',
        },
        // User who approved/rejected
        approverId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        // Comments/notes from the approver
        comments: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        // Timestamp when action was taken
        actionAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        // Deadline for this approval step (optional)
        deadline: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        // Auto-approve if no action after deadline
        autoApprove: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        // Assigned approver (optional - can be assigned to specific user)
        assignedToUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        // Required role for this approval (HR, FINANCE, admin)
        requiredRole: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
    },
    {
        tableName: 'payroll_approvals',
        timestamps: true,
        indexes: [
            { fields: ['payrollRunId'] },
            { fields: ['businessId'] },
            { fields: ['step'] },
            { fields: ['status'] },
            { fields: ['approverId'] },
        ],
    }
);

export { PayrollApproval };
export default PayrollApproval;
