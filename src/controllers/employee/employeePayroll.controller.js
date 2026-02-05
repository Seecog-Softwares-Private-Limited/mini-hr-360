// src/controllers/employee/employeePayroll.controller.js
import {
    Payslip,
    PayrollRun,
    EmployeeBankDetail,
    EmployeeSalaryStructure,
    EmployeeSalaryAssignment,
    PayrollQuery,
    SalaryStructure,
    Employee
} from '../../models/index.js';
import { Op } from 'sequelize';

// Helper to format currency
const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0';
    return Number(amount).toLocaleString('en-IN');
};

// Helper to format date
const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
    });
};

// Helper to get month name
const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1] || 'Unknown';
};

/**
 * Render My Payslips Page
 */
export const renderMyPayslips = async (req, res) => {
    try {
        const employee = req.employee;
        // Use the existing view `payslips.hbs` and the employee layout `employee-main`.
        res.render('employee/payroll/payslips', {
            title: 'My Payslips',
            employee,
            active: 'payslips',
            layout: 'employee-main'
        });
    } catch (error) {
        console.error('Error rendering payslips:', error);
        res.status(500).render('error', { message: 'Internal Server Error' });
    }
};

/**
 * Render Bank & Tax page
 */
export const renderBankTax = async (req, res) => {
    try {
        const employee = req.employee;
        res.render('employee/payroll/bank_tax', {
            title: 'Bank & Tax Details',
            employee,
            active: 'bank-tax',
            layout: 'employee-main',
        });
    } catch (error) {
        console.error('Error rendering bank & tax:', error);
        res.status(500).render('error', { message: 'Internal Server Error' });
    }
};

/**
 * Render Salary Details page
 */
export const renderSalaryDetails = async (req, res) => {
    try {
        const employee = req.employee;
        res.render('employee/payroll/salary_details', {
            title: 'Salary Details',
            employee,
            active: 'salary-details',
            layout: 'employee-main',
        });
    } catch (error) {
        console.error('Error rendering salary details:', error);
        res.status(500).render('error', { message: 'Internal Server Error' });
    }
};

/**
 * Render single payslip view page
 */
export const renderPayslipView = async (req, res) => {
    try {
        const employee = req.employee;
        const { id } = req.params;
        res.render('employee/payroll/payslip_view', {
            title: 'Payslip',
            employee,
            payslipId: id,
            active: 'payslips',
            layout: 'employee-main',
        });
    } catch (error) {
        console.error('Error rendering payslip view:', error);
        res.status(500).render('error', { message: 'Internal Server Error' });
    }
};

/**
 * Render Payroll Queries page
 */
export const renderPayrollQueries = async (req, res) => {
    try {
        const employee = req.employee;
        res.render('employee/payroll/queries', {
            title: 'Payroll Queries',
            employee,
            active: 'queries',
            layout: 'employee-main',
        });
    } catch (error) {
        console.error('Error rendering payroll queries:', error);
        res.status(500).render('error', { message: 'Internal Server Error' });
    }
};

/**
 * Get Payslips List (API)
 */
export const getMyPayslips = async (req, res) => {
    try {
        const employeeId = req.employee.id;
        const { year } = req.query;
        
        // Build where clause
        const whereClause = { employeeId };
        if (year) {
            whereClause.periodYear = parseInt(year);
        }
        
        const payslips = await Payslip.findAll({
            where: whereClause,
            include: [{ 
                model: PayrollRun, 
                as: 'payrollRun', 
                attributes: ['status', 'processedDate'] 
            }],
            order: [['periodYear', 'DESC'], ['periodMonth', 'DESC']]
        });

        // Format payslips for the view
        const formattedPayslips = payslips.map(p => {
            const earnings = p.earnings || {};
            const deductions = p.deductions || {};
            
            // Calculate total earnings
            const totalEarnings = Object.values(earnings).reduce((sum, val) => 
                sum + (typeof val === 'number' ? val : parseFloat(val) || 0), 0);
            
            // Calculate total deductions
            const totalDeductions = Object.values(deductions).reduce((sum, val) => 
                sum + (typeof val === 'number' ? val : parseFloat(val) || 0), 0);
            
            return {
                id: p.id,
                period: `${getMonthName(p.periodMonth)} ${p.periodYear}`,
                periodMonth: p.periodMonth,
                periodYear: p.periodYear,
                payDate: p.payrollRun?.processedDate ? formatDate(p.payrollRun.processedDate) : formatDate(p.publishedAt),
                earnings: formatCurrency(totalEarnings),
                deductions: formatCurrency(totalDeductions),
                netPay: formatCurrency(p.netPay),
                status: p.status || 'Published',
                pdfUrl: p.pdfUrl
            };
        });

        res.json({ success: true, payslips: formattedPayslips });
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

        // Get employee details
        const employee = await Employee.findByPk(employeeId);
        
        // Format earnings and deductions
        const earnings = payslip.earnings || {};
        const deductions = payslip.deductions || {};
        
        // Convert to arrays for display
        const earningsArray = Object.entries(earnings).map(([name, amount]) => ({
            name,
            amount: formatCurrency(amount)
        }));
        
        const deductionsArray = Object.entries(deductions).map(([name, amount]) => ({
            name,
            amount: formatCurrency(amount)
        }));
        
        const totalEarnings = Object.values(earnings).reduce((sum, val) => 
            sum + (typeof val === 'number' ? val : parseFloat(val) || 0), 0);
        
        const totalDeductions = Object.values(deductions).reduce((sum, val) => 
            sum + (typeof val === 'number' ? val : parseFloat(val) || 0), 0);

        const formattedPayslip = {
            id: payslip.id,
            period: `${getMonthName(payslip.periodMonth)} ${payslip.periodYear}`,
            periodMonth: payslip.periodMonth,
            periodYear: payslip.periodYear,
            payDate: payslip.payrollRun?.processedDate ? formatDate(payslip.payrollRun.processedDate) : formatDate(payslip.publishedAt),
            earnings: earningsArray,
            deductions: deductionsArray,
            totalEarnings: formatCurrency(totalEarnings),
            totalDeductions: formatCurrency(totalDeductions),
            netPay: formatCurrency(payslip.netPay),
            status: payslip.status,
            pdfUrl: payslip.pdfUrl,
            employee: {
                name: `${employee.firstName} ${employee.lastName}`,
                employeeId: employee.employeeId,
                department: employee.department,
                designation: employee.designation
            }
        };

        res.json({ success: true, payslip: formattedPayslip });
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
        const employee = req.employee;
        
        let bankDetails = await EmployeeBankDetail.findOne({ where: { employeeId } });

        if (!bankDetails) {
            // Create empty record if not exists
            bankDetails = await EmployeeBankDetail.create({ employeeId });
        }

        // Combine bank details with employee info for complete data
        const combinedData = {
            // Bank details from employee_bank_details table
            id: bankDetails.id,
            bankName: bankDetails.bankName || '',
            accountNumber: bankDetails.accountNumber || '',
            accountHolderName: bankDetails.accountHolderName || `${employee.firstName} ${employee.lastName}`,
            ifscCode: bankDetails.ifscCode || '',
            branchName: bankDetails.branchName || '',
            // Tax details
            panNumber: bankDetails.panNumber || '',
            uanNumber: bankDetails.uanNumber || '',
            esiNumber: bankDetails.esiNumber || '',
            aadhaarNumber: bankDetails.aadhaarNumber || '',
            taxDeclarationStatus: bankDetails.taxDeclarationStatus || 'Not Submitted',
            // Employee contact info
            email: employee.empEmail || employee.workEmail || '',
            phone: employee.empPhone || '',
            // Address from employee table
            address: employee.presentAddressLine1 || '',
            city: employee.presentCity || '',
            state: employee.presentState || '',
            pinCode: employee.presentZip || '',
            country: employee.presentCountry || 'India',
            updatedAt: bankDetails.updatedAt,
        };

        res.json({ success: true, bankDetails: combinedData });
    } catch (error) {
        console.error('Error fetching bank details:', error);
        res.status(500).json({ success: false, message: 'Error fetching bank details' });
    }
};

/**
 * Update Bank and Tax Details (API)
 */
export const updateBankAndTaxDetails = async (req, res) => {
    try {
        const employeeId = req.employee.id;
        const {
            bankName,
            accountNumber,
            accountHolderName,
            ifscCode,
            branchName,
            panNumber,
            uanNumber,
            esiNumber,
            aadhaarNumber,
        } = req.body;

        let bankDetails = await EmployeeBankDetail.findOne({ where: { employeeId } });

        if (!bankDetails) {
            bankDetails = await EmployeeBankDetail.create({ employeeId });
        }

        await bankDetails.update({
            bankName,
            accountNumber,
            accountHolderName,
            ifscCode,
            branchName,
            panNumber,
            uanNumber,
            esiNumber,
            aadhaarNumber,
        });

        res.json({ success: true, message: 'Bank details updated successfully', bankDetails });
    } catch (error) {
        console.error('Error updating bank details:', error);
        res.status(500).json({ success: false, message: 'Error updating bank details' });
    }
};

/**
 * Get Salary Details (API) - Read Only for employee
 */
export const getSalaryDetails = async (req, res) => {
    try {
        const employeeId = req.employee.id;
        const businessId = req.employee.businessId;
        
        // First try EmployeeSalaryAssignment (the payroll module's assignment)
        let salaryAssignment = await EmployeeSalaryAssignment.findOne({
            where: { 
                employeeId,
                [Op.or]: [
                    { effectiveTo: null },
                    { effectiveTo: { [Op.gte]: new Date() } }
                ]
            },
            include: [{ 
                model: SalaryStructure, 
                as: 'salaryStructure' 
            }],
            order: [['effectiveFrom', 'DESC']]
        });
        
        // Fallback to EmployeeSalaryStructure if assignment not found
        if (!salaryAssignment) {
            const empSalaryStructure = await EmployeeSalaryStructure.findOne({
                where: { employeeId, isActive: true },
                include: [{ model: SalaryStructure, as: 'salaryStructure' }],
                order: [['effectiveDate', 'DESC']]
            });
            
            if (empSalaryStructure && empSalaryStructure.salaryStructure) {
                salaryAssignment = {
                    salaryStructure: empSalaryStructure.salaryStructure,
                    effectiveFrom: empSalaryStructure.effectiveDate,
                    ctc: empSalaryStructure.ctc,
                    breakup: empSalaryStructure.breakup
                };
            }
        }
        
        if (!salaryAssignment || !salaryAssignment.salaryStructure) {
            return res.json({ success: true, salaryDetails: null });
        }
        
        const structure = salaryAssignment.salaryStructure;
        // Components is a flat array with type: 'EARNING' or 'DEDUCTION' and calcType: 'fixed' or 'percentage'
        const rawComponents = structure.components || [];
        
        // Separate earnings and deductions
        const earningsComponents = rawComponents.filter(c => c.type === 'EARNING' || c.type === 'earning' || c.type === 'Earning');
        const deductionsComponents = rawComponents.filter(c => c.type === 'DEDUCTION' || c.type === 'deduction' || c.type === 'Deduction');
        
        // Calculate CTC from earnings (monthly values)
        let monthlyCTC = earningsComponents.reduce((sum, e) => {
            if (e.calcType === 'fixed') return sum + (parseFloat(e.value) || 0);
            return sum;
        }, 0);
        
        // If no fixed earnings, check for a basic salary
        if (monthlyCTC === 0) {
            const basicComp = earningsComponents.find(e => e.name?.toLowerCase().includes('basic'));
            if (basicComp) monthlyCTC = parseFloat(basicComp.value) || 0;
        }
        
        const annualCTC = monthlyCTC * 12;
        
        // Process earnings components
        const earningsArray = earningsComponents.map(e => {
            let amount = 0;
            if (e.calcType === 'fixed' || e.calcType === 'Fixed') {
                amount = parseFloat(e.value) || 0;
            } else if (e.calcType === 'percentage' || e.calcType === 'percent') {
                // Calculate based on reference (usually Basic)
                const basic = earningsComponents.find(c => c.name?.toLowerCase().includes('basic'));
                const baseAmount = basic ? parseFloat(basic.value) || 0 : monthlyCTC * 0.4;
                amount = (parseFloat(e.value) || 0) / 100 * baseAmount;
            }
            return {
                name: e.name || e.componentId || 'Component',
                description: e.description || '',
                amount: formatCurrency(amount),
                rawAmount: amount,
                taxable: e.taxable !== false
            };
        });
        
        // Process deductions components
        const deductionsArray = deductionsComponents.map(d => {
            let amount = 0;
            if (d.calcType === 'fixed' || d.calcType === 'Fixed') {
                amount = parseFloat(d.value) || 0;
            } else if (d.calcType === 'percentage' || d.calcType === 'percent') {
                // Calculate based on Basic
                const basic = earningsComponents.find(c => c.name?.toLowerCase().includes('basic'));
                const baseAmount = basic ? parseFloat(basic.value) || 0 : monthlyCTC * 0.4;
                amount = (parseFloat(d.value) || 0) / 100 * baseAmount;
            }
            return {
                name: d.name || d.componentId || 'Deduction',
                description: d.description || '',
                amount: formatCurrency(amount),
                rawAmount: amount,
                note: d.note || ''
            };
        });
        
        // Calculate totals
        const totalEarnings = earningsArray.reduce((sum, e) => sum + e.rawAmount, 0);
        const totalDeductions = deductionsArray.reduce((sum, d) => sum + d.rawAmount, 0);
        const grossPay = totalEarnings;
        const netPay = grossPay - totalDeductions;
        
        // Find basic salary
        const basicComponent = earningsArray.find(e => 
            e.name.toLowerCase().includes('basic')
        );
        const basicAmount = basicComponent ? basicComponent.rawAmount : monthlyCTC * 0.4;
        const basicPercentage = monthlyCTC > 0 ? Math.round((basicAmount / monthlyCTC) * 100) : 40;
        
        // Calculate allowances (non-basic earnings)
        const allowancesTotal = earningsArray
            .filter(e => !e.name.toLowerCase().includes('basic'))
            .reduce((sum, e) => sum + e.rawAmount, 0);
        const allowancesPercentage = monthlyCTC > 0 ? Math.round((allowancesTotal / monthlyCTC) * 100) : 0;
        
        // Statutory deductions
        const statutoryDeductions = deductionsArray
            .filter(d => ['pf', 'esi', 'pt', 'tds', 'provident', 'professional'].some(
                k => d.name.toLowerCase().includes(k)
            ))
            .reduce((sum, d) => sum + d.rawAmount, 0);

        const salaryDetails = {
            structure: {
                name: structure.name,
                description: structure.description || 'Your current salary structure',
                effectiveDate: formatDate(salaryAssignment.effectiveFrom || structure.effectiveDate),
                monthlyCTC: formatCurrency(monthlyCTC),
                annualCTC: formatCurrency(annualCTC),
                grossPay: formatCurrency(grossPay),
                netPay: formatCurrency(netPay)
            },
            earnings: earningsArray,
            deductions: deductionsArray,
            totalEarnings: formatCurrency(totalEarnings),
            totalDeductions: formatCurrency(totalDeductions),
            basic: formatCurrency(basicAmount),
            basicPercentage,
            allowances: formatCurrency(allowancesTotal),
            allowancesPercentage,
            statutoryDeductions: formatCurrency(statutoryDeductions),
            takeHome: formatCurrency(netPay),
            lastRevision: formatDate(salaryAssignment.effectiveFrom || structure.updatedAt)
        };

        res.json({ success: true, salaryDetails });
    } catch (error) {
        console.error('Error fetching salary details:', error);
        res.status(500).json({ success: false, message: 'Error fetching salary details', detailedError: error.message });
    }
};

/**
 * Raise Payroll Query
 */
export const raisePayrollQuery = async (req, res) => {
    try {
        const employeeId = req.employee.id;
        const businessId = req.employee.businessId;
        const { category, subject, description, period } = req.body;

        // Validate required fields
        if (!category || !subject || !description) {
            return res.status(400).json({
                success: false,
                message: 'Category, subject, and description are required'
            });
        }

        // Validate category against ENUM values
        const validCategories = ['Salary Mismatch', 'Tax Deduction', 'Reimbursement', 'LOP/Attendance', 'Other'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category. Valid options: ' + validCategories.join(', ')
            });
        }

        const query = await PayrollQuery.create({
            employeeId,
            businessId,
            category,
            subject,
            description,
            status: 'Pending'
        });

        res.json({ 
            success: true, 
            query: {
                id: query.id,
                category: query.category,
                subject: query.subject,
                description: query.description,
                status: query.status,
                createdAt: formatDate(query.createdAt)
            }, 
            message: 'Query submitted successfully. Our team will respond within 24-48 hours.' 
        });
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

        // Format queries for the view
        const formattedQueries = queries.map(q => ({
            id: q.id,
            category: q.category,
            subject: q.subject,
            description: q.description,
            status: q.status,
            resolutionNotes: q.resolutionNotes,
            resolvedAt: q.resolvedAt ? formatDate(q.resolvedAt) : null,
            createdAt: formatDate(q.createdAt),
            lastUpdated: formatDate(q.updatedAt)
        }));

        res.json({ success: true, queries: formattedQueries });
    } catch (error) {
        console.error('Error fetching payroll queries:', error);
        res.status(500).json({ success: false, message: 'Error fetching payroll queries' });
    }
};

/**
 * Get Single Query Detail (API)
 */
export const getQueryDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const employeeId = req.employee.id;

        const query = await PayrollQuery.findOne({
            where: { id, employeeId }
        });

        if (!query) {
            return res.status(404).json({ success: false, message: 'Query not found' });
        }

        res.json({ 
            success: true, 
            query: {
                id: query.id,
                category: query.category,
                subject: query.subject,
                description: query.description,
                status: query.status,
                resolutionNotes: query.resolutionNotes,
                resolvedAt: query.resolvedAt ? formatDate(query.resolvedAt) : null,
                createdAt: formatDate(query.createdAt)
            }
        });
    } catch (error) {
        console.error('Error fetching query detail:', error);
        res.status(500).json({ success: false, message: 'Error fetching query detail' });
    }
};
