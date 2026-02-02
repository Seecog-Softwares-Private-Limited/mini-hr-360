'use strict';

/**
 * Migration: Add Payment Tracking Columns
 * 
 * This migration adds payment tracking fields to support salary disbursement via RazorpayX or bank files.
 * 
 * Tables affected:
 * - payroll_runs: paymentStatus, paymentInitiatedAt, paymentCompletedAt, paymentSummary
 * - payroll_run_items: paymentStatus, paymentId, paymentMode, paymentUtr, paymentInitiatedAt, paymentProcessedAt, paymentError
 * - employee_bank_details: razorpayContactId, razorpayFundAccountId
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Add payment tracking columns to payroll_runs
      const payrollRunsColumns = await queryInterface.describeTable('payroll_runs');
      
      if (!payrollRunsColumns.paymentStatus) {
        await queryInterface.addColumn('payroll_runs', 'paymentStatus', {
          type: Sequelize.ENUM('pending', 'initiated', 'partial', 'completed', 'failed'),
          defaultValue: 'pending',
          allowNull: true
        }, { transaction });
      }
      
      if (!payrollRunsColumns.paymentInitiatedAt) {
        await queryInterface.addColumn('payroll_runs', 'paymentInitiatedAt', {
          type: Sequelize.DATE,
          allowNull: true
        }, { transaction });
      }
      
      if (!payrollRunsColumns.paymentCompletedAt) {
        await queryInterface.addColumn('payroll_runs', 'paymentCompletedAt', {
          type: Sequelize.DATE,
          allowNull: true
        }, { transaction });
      }
      
      if (!payrollRunsColumns.paymentSummary) {
        await queryInterface.addColumn('payroll_runs', 'paymentSummary', {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'JSON summary of payment processing results'
        }, { transaction });
      }
      
      // Add payment tracking columns to payroll_run_items
      const payrollRunItemsColumns = await queryInterface.describeTable('payroll_run_items');
      
      if (!payrollRunItemsColumns.paymentStatus) {
        await queryInterface.addColumn('payroll_run_items', 'paymentStatus', {
          type: Sequelize.ENUM('pending', 'processing', 'processed', 'failed', 'reversed'),
          defaultValue: 'pending',
          allowNull: true
        }, { transaction });
      }
      
      if (!payrollRunItemsColumns.paymentId) {
        await queryInterface.addColumn('payroll_run_items', 'paymentId', {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'RazorpayX payout ID or bank reference'
        }, { transaction });
      }
      
      if (!payrollRunItemsColumns.paymentMode) {
        await queryInterface.addColumn('payroll_run_items', 'paymentMode', {
          type: Sequelize.ENUM('NEFT', 'RTGS', 'IMPS', 'UPI'),
          allowNull: true
        }, { transaction });
      }
      
      if (!payrollRunItemsColumns.paymentUtr) {
        await queryInterface.addColumn('payroll_run_items', 'paymentUtr', {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'Bank UTR reference number'
        }, { transaction });
      }
      
      if (!payrollRunItemsColumns.paymentInitiatedAt) {
        await queryInterface.addColumn('payroll_run_items', 'paymentInitiatedAt', {
          type: Sequelize.DATE,
          allowNull: true
        }, { transaction });
      }
      
      if (!payrollRunItemsColumns.paymentProcessedAt) {
        await queryInterface.addColumn('payroll_run_items', 'paymentProcessedAt', {
          type: Sequelize.DATE,
          allowNull: true
        }, { transaction });
      }
      
      if (!payrollRunItemsColumns.paymentError) {
        await queryInterface.addColumn('payroll_run_items', 'paymentError', {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'Error message if payment failed'
        }, { transaction });
      }
      
      // Add RazorpayX columns to employee_bank_details
      const bankDetailsColumns = await queryInterface.describeTable('employee_bank_details');
      
      if (!bankDetailsColumns.razorpayContactId) {
        await queryInterface.addColumn('employee_bank_details', 'razorpayContactId', {
          type: Sequelize.STRING(50),
          allowNull: true,
          comment: 'RazorpayX Contact ID for the employee'
        }, { transaction });
      }
      
      if (!bankDetailsColumns.razorpayFundAccountId) {
        await queryInterface.addColumn('employee_bank_details', 'razorpayFundAccountId', {
          type: Sequelize.STRING(50),
          allowNull: true,
          comment: 'RazorpayX Fund Account ID for the bank account'
        }, { transaction });
      }
      
      await transaction.commit();
      console.log('✅ Payment tracking columns added successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove columns from payroll_runs
      await queryInterface.removeColumn('payroll_runs', 'paymentStatus', { transaction });
      await queryInterface.removeColumn('payroll_runs', 'paymentInitiatedAt', { transaction });
      await queryInterface.removeColumn('payroll_runs', 'paymentCompletedAt', { transaction });
      await queryInterface.removeColumn('payroll_runs', 'paymentSummary', { transaction });
      
      // Remove columns from payroll_run_items
      await queryInterface.removeColumn('payroll_run_items', 'paymentStatus', { transaction });
      await queryInterface.removeColumn('payroll_run_items', 'paymentId', { transaction });
      await queryInterface.removeColumn('payroll_run_items', 'paymentMode', { transaction });
      await queryInterface.removeColumn('payroll_run_items', 'paymentUtr', { transaction });
      await queryInterface.removeColumn('payroll_run_items', 'paymentInitiatedAt', { transaction });
      await queryInterface.removeColumn('payroll_run_items', 'paymentProcessedAt', { transaction });
      await queryInterface.removeColumn('payroll_run_items', 'paymentError', { transaction });
      
      // Remove columns from employee_bank_details
      await queryInterface.removeColumn('employee_bank_details', 'razorpayContactId', { transaction });
      await queryInterface.removeColumn('employee_bank_details', 'razorpayFundAccountId', { transaction });
      
      await transaction.commit();
      console.log('✅ Payment tracking columns removed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
