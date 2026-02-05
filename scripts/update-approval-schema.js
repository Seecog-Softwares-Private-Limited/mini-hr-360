// scripts/update-approval-schema.js
// Update payroll_approvals table to add WAITING status

import dotenv from 'dotenv';
dotenv.config({ path: './property.env' });

import { sequelize } from '../src/db/index.js';

async function updateApprovalSchema() {
    try {
        console.log('Updating payroll_approvals schema...');
        
        // MySQL doesn't allow easy ALTER on ENUM, so we need to modify the column
        // First check if WAITING already exists
        const [results] = await sequelize.query(`
            SELECT COLUMN_TYPE 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'payroll_approvals' 
            AND COLUMN_NAME = 'status'
        `);
        
        if (results.length > 0 && results[0].COLUMN_TYPE.includes('WAITING')) {
            console.log('WAITING status already exists in status ENUM');
        } else {
            // Alter the column to add WAITING
            await sequelize.query(`
                ALTER TABLE payroll_approvals 
                MODIFY COLUMN status ENUM('WAITING', 'PENDING', 'APPROVED', 'REJECTED', 'SKIPPED') 
                DEFAULT 'WAITING'
            `);
            console.log('✅ Added WAITING to status ENUM');
        }
        
        // Also update stepName ENUM to remove ADMIN_APPROVAL if present
        await sequelize.query(`
            ALTER TABLE payroll_approvals 
            MODIFY COLUMN stepName ENUM('HR_REVIEW', 'FINANCE_REVIEW') 
            NOT NULL
        `).catch(e => {
            // This might fail if there's existing data with ADMIN_APPROVAL
            console.log('Note: Could not update stepName ENUM (may have existing ADMIN_APPROVAL rows):', e.message);
        });
        
        console.log('Schema update complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error updating schema:', error);
        process.exit(1);
    }
}

updateApprovalSchema();
