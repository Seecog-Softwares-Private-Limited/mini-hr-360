// src/controllers/employee/employeePayroll.controller.js
import {
    Payslip,
    PayrollRun,
    EmployeeBankDetail,
    EmployeeSalaryStructure,
    PayrollQuery,
    SalaryStructure
} from '../../models/index.js';

/**
 * Render My Payslips Page
 */
export const renderMyPayslips = async (req, res) => {
    try {
        const employee = req.employee;
        res.render('employee/payroll/my-payslips', {
            title: 'My Payslips',
            employee,
            active: 'payslips',
            layout: 'employee-layout'
        });
    } catch (error) {
        console.error('Error rendering payslips:', error);
        res.status(500).render('error', { message: 'Internal Server Error' });
    }
};

/**
 * Get Payslips List (API)
 */
export const getMyPayslips = async (req, res) => {
    try {
        const employeeId = req.employee.id;
        const payslips = await Payslip.findAll({
            where: { employeeId },
            include: [{ model: PayrollRun, as: 'payrollRun', attributes: ['status', 'processedDate'] }],
            order: [['periodYear', 'DESC'], ['periodMonth', 'DESC']]
        });

        res.json({ success: true, payslips });
    } catch (error) {
        console.error('Error fetching payslips:', error);
        res.status(500).json({ success: false, message: 'Error fetching payslips', detailedError: error.message });
    }

};

/**
 * Get Payslip Detail (API)
 */
export const getPayslipDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const employeeId = req.employee.id;

        const payslip = await Payslip.findOne({
            where: { id, employeeId },
            include: [{ model: PayrollRun, as: 'payrollRun' }]
        });

        if (!payslip) {
            return res.status(404).json({ success: false, message: 'Payslip not found' });
        }

        res.json({ success: true, payslip });
    } catch (error) {
        console.error('Error fetching payslip detail:', error);
        res.status(500).json({ success: false, message: 'Error fetching payslip detail', detailedError: error.message });
    }

};

/**
 * Get Bank and Tax Details (API)
 */
export const getBankAndTaxDetails = async (req, res) => {
    try {
        const employeeId = req.employee.id;
        let bankDetails = await EmployeeBankDetail.findOne({ where: { employeeId } });

        if (!bankDetails) {
            // Create empty record if not exists
            bankDetails = await EmployeeBankDetail.create({ employeeId });
        }

        res.json({ success: true, bankDetails });
    } catch (error) {
        console.error('Error fetching bank details:', error);
        res.status(500).json({ success: false, message: 'Error fetching bank details' });
    }
};

/**
 * Get Salary Details (API) - Read Only for employee
 */
export const getSalaryDetails = async (req, res) => {
    try {
        const employeeId = req.employee.id;
        const salaryStructure = await EmployeeSalaryStructure.findOne({
            where: { employeeId, isActive: true },
            include: [{ model: SalaryStructure, as: 'salaryStructure' }],
            order: [['effectiveDate', 'DESC']]
        });

        res.json({ success: true, salaryStructure });
    } catch (error) {
        console.error('Error fetching salary details:', error);
        res.status(500).json({ success: false, message: 'Error fetching salary details' });
    }
};

/**
 * Raise Payroll Query
 */
export const raisePayrollQuery = async (req, res) => {
    try {
        const employeeId = req.employee.id;
        const businessId = req.employee.businessId;
        const { category, subject, description } = req.body;

        const query = await PayrollQuery.create({
            employeeId,
            businessId,
            category,
            subject,
            description,
            status: 'Pending'
        });

        res.json({ success: true, query, message: 'Query raised successfully' });
    } catch (error) {
        console.error('Error raising payroll query:', error);

        // Handle Sequelize validation errors (e.g., ENUM violations)
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeDatabaseError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid data provided. Please check your inputs.',
                error: error.message
            });
        }

        res.status(500).json({ success: false, message: 'Error raising payroll query' });
    }
};

/**
 * Get My Payroll Queries
 */
export const getMyPayrollQueries = async (req, res) => {
    try {
        const employeeId = req.employee.id;
        const queries = await PayrollQuery.findAll({
            where: { employeeId },
            order: [['createdAt', 'DESC']]
        });

        res.json({ success: true, queries });
    } catch (error) {
        console.error('Error fetching payroll queries:', error);
        res.status(500).json({ success: false, message: 'Error fetching payroll queries' });
    }
};
