// create-approval-tables.js
// Quick script to create the payroll approval workflow tables

import dotenv from 'dotenv';
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || './property.env' });

import { sequelize } from '../src/db/index.js';

async function createTables() {
    try {
        console.log('🔄 Creating payroll approval workflow tables...');

        // Create payroll_approvals table
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS payroll_approvals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                payrollRunId INT NOT NULL,
                businessId INT NOT NULL,
                step INT NOT NULL,
                stepName ENUM('HR_REVIEW', 'FINANCE_REVIEW', 'ADMIN_APPROVAL') NOT NULL,
                status ENUM('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED') DEFAULT 'PENDING',
                approverId INT NULL,
                comments TEXT NULL,
                actionAt DATETIME NULL,
                deadline DATETIME NULL,
                autoApprove BOOLEAN DEFAULT FALSE,
                assignedToUserId INT NULL,
                requiredRole VARCHAR(50) NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_payrollRunId (payrollRunId),
                INDEX idx_businessId (businessId),
                INDEX idx_step (step),
                INDEX idx_status (status),
                INDEX idx_approverId (approverId),
                FOREIGN KEY (payrollRunId) REFERENCES payroll_runs(id) ON DELETE CASCADE ON UPDATE CASCADE,
                FOREIGN KEY (businessId) REFERENCES businesses(id),
                FOREIGN KEY (approverId) REFERENCES users(id),
                FOREIGN KEY (assignedToUserId) REFERENCES users(id)
            )
        `);
        console.log('✅ Created payroll_approvals table');

        // Create notifications table
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userId INT NOT NULL,
                businessId INT NULL,
                type ENUM('PAYROLL_PENDING_APPROVAL', 'PAYROLL_APPROVED', 'PAYROLL_REJECTED', 'PAYROLL_CREATED', 'LEAVE_REQUEST', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'SYSTEM_ALERT', 'INFO') NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NULL,
                priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
                link VARCHAR(500) NULL,
                entityType VARCHAR(50) NULL,
                entityId INT NULL,
                isRead BOOLEAN DEFAULT FALSE,
                readAt DATETIME NULL,
                isDismissed BOOLEAN DEFAULT FALSE,
                targetRole VARCHAR(50) NULL,
                metadata JSON NULL,
                expiresAt DATETIME NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_userId (userId),
                INDEX idx_businessId (businessId),
                INDEX idx_type (type),
                INDEX idx_isRead (isRead),
                INDEX idx_targetRole (targetRole),
                INDEX idx_createdAt (createdAt),
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
                FOREIGN KEY (businessId) REFERENCES businesses(id)
            )
        `);
        console.log('✅ Created notifications table');

        console.log('');
        console.log('🎉 All payroll approval workflow tables created successfully!');
        
        await sequelize.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
        await sequelize.close();
        process.exit(1);
    }
}

createTables();
