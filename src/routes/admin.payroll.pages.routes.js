import { Router } from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';
import { Business, PayrollRun } from '../models/index.js';

import * as payrollSetupService from '../services/payroll/payrollSetup.service.js';
import * as salaryStructureService from '../services/payroll/salaryStructure.service.js';
import * as payrollRunService from '../services/payroll/payrollRun.service.js';
import * as payrollQueryService from '../services/payroll/payrollQuery.service.js';
import * as statutoryService from '../services/payroll/statutoryReports.service.js';
import * as payslipService from '../services/payroll/payslip.service.js';

const router = Router();
router.use(verifyUser);

const resolveBusinessId = async (req) => {
  // Check user's businessId or defaultBusinessId first
  const raw = req.user?.businessId || req.user?.defaultBusinessId || Number(req.query?.businessId) || null;
  if (Number.isFinite(Number(raw)) && Number(raw) > 0) return Number(raw);

  // fallback: find business by ownerId (same logic as controller)
  const ownerId = req.user?.id;
  if (ownerId) {
    const biz = await Business.findOne({ where: { ownerId }, order: [['createdAt', 'ASC']] });
    if (biz?.id) return biz.id;
  }

  // Fallback: If only 1 business exists (Single Tenant Mode), use it
  try {
    const count = await Business.count();
    if (count === 1) {
      const biz = await Business.findOne();
      if (biz?.id) return biz.id;
    }
  } catch (e) { console.error('Error auto-resolving business:', e); }

  return null;
};

// Payroll setup
router.get('/setup', async (req, res) => {
  const user = { firstName: req.user.firstName, lastName: req.user.lastName };
  const businessId = await resolveBusinessId(req);
  const setup = businessId ? await payrollSetupService.getSetup(businessId) : null;
  res.render('admin/payroll/setup', { title: 'Payroll Setup', user, active: 'payroll-setup', activeGroup: 'payroll', setup, businessId });
});

// Salary structures
router.get('/structures', async (req, res) => {
  const user = { firstName: req.user.firstName, lastName: req.user.lastName };
  const businessId = await resolveBusinessId(req);
  let structures = [];
  if (businessId) {
    try {
      structures = await salaryStructureService.listStructures(businessId);
    } catch (e) {
      console.error('Error fetching salary structures:', e && e.message ? e.message : e);
      structures = [];
    }
  }
  res.render('admin/payroll/structures', { title: 'Salary Structures', user, active: 'payroll-structures', activeGroup: 'payroll', structures, businessId });
});

// Payroll runs list
router.get('/runs', async (req, res) => {
  const user = { firstName: req.user.firstName, lastName: req.user.lastName, role: req.user.role };
  const businessId = await resolveBusinessId(req);
  console.log(`[GET /runs] Resolved Business ID: ${businessId}`);
  let runs = [];
  if (businessId) {
    try {
      runs = await PayrollRun.findAll({ where: { businessId }, order: [['createdAt', 'DESC']] });
      const logMsg = `[GET /runs] Found ${runs.length} runs for business ${businessId}. IDs: ${runs.map(r => r.id).join(', ')}`;
      console.log(logMsg);
      // Write to a temporary file we can read
      import('fs').then(fs => fs.appendFileSync('debug_runs.log', logMsg + '\n'));
    } catch (e) {
      console.error('Error fetching PayrollRun list:', e && e.message ? e.message : e);
      import('fs').then(fs => fs.appendFileSync('debug_runs.log', `ERROR: ${e.message}\n`));
      runs = [];
    }
    // normalize display fields used in template
    runs = runs.map(r => ({
      id: r.id,
      period: r.period || `${r.periodYear || ''}-${String(r.periodMonth || '').padStart(2, '0')}`,
      startDate: r.processedDate ? new Date(r.processedDate).toLocaleDateString() : '-',
      endDate: r.processedDate ? new Date(r.processedDate).toLocaleDateString() : '-',
      status: r.status || 'DRAFT',
      employeeCount: r.employeeCount || 0,
      netPay: r.totalNetPay || 0,
      updatedAt: r.updatedAt,
    }));
  }
  const periodDisplayName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  res.render('admin/payroll/runs', { title: 'Payroll Runs', user, active: 'payroll-runs', activeGroup: 'payroll', runs, periodDisplayName, businessId });
});

// Payroll register - auto-redirect to latest run
router.get('/register', async (req, res) => {
  const user = { firstName: req.user.firstName, lastName: req.user.lastName };
  const businessId = await resolveBusinessId(req);
  
  try {
    // Find the latest payroll run for this business
    const latestRun = await PayrollRun.findOne({
      where: { businessId },
      order: [['createdAt', 'DESC']]
    });
    
    if (latestRun) {
      // Redirect to the register for the latest run
      return res.redirect(`/admin/payroll/register/${latestRun.id}`);
    }
    
    // No runs exist - show empty page with message
    res.render('admin/payroll/register', {
      title: 'Payroll Register',
      user,
      active: 'payroll-register',
      activeGroup: 'payroll',
      runId: null,
      noRuns: true,
      error: 'No payroll runs found. Please create a payroll run first.',
      businessId
    });
  } catch (error) {
    console.error('[Page Route Error] /register:', error);
    res.render('admin/payroll/register', {
      title: 'Payroll Register',
      user,
      active: 'payroll-register',
      activeGroup: 'payroll',
      error: error.message || 'Error loading payroll register'
    });
  }
});

// Payroll register for a run
router.get('/register/:runId', async (req, res) => {
  const user = { firstName: req.user.firstName, lastName: req.user.lastName };
  const runId = Number(req.params.runId);
  let registerData = {};
  try {
    if (runId) {
      registerData = await payrollRunService.getRegister(runId);
    }
    res.render('admin/payroll/register', {
      title: 'Payroll Register',
      user,
      active: 'payroll-register',
      activeGroup: 'payroll',
      runId,
      ...registerData
    });
  } catch (error) {
    console.error('[Page Route Error] /register/:runId:', error);
    res.render('admin/payroll/register', {
      title: 'Payroll Register Error',
      user,
      active: 'payroll-register',
      activeGroup: 'payroll',
      runId,
      error: error.message || 'An unexpected error occurred while loading the payroll register'
    });
  }
});

// Payslips - auto-redirect to latest run
router.get('/payslips', async (req, res) => {
  const user = { firstName: req.user.firstName, lastName: req.user.lastName };
  const businessId = await resolveBusinessId(req);
  
  try {
    // Find the latest payroll run for this business
    const latestRun = await PayrollRun.findOne({
      where: { businessId },
      order: [['createdAt', 'DESC']]
    });
    
    if (latestRun) {
      // Redirect to the payslips for the latest run
      return res.redirect(`/admin/payroll/payslips/${latestRun.id}`);
    }
    
    // No runs exist - show empty page with message
    res.render('admin/payroll/payslips', {
      title: 'Payslips',
      user,
      active: 'payroll-payslips',
      activeGroup: 'payroll',
      runId: null,
      noRuns: true,
      payslips: [],
      error: 'No payroll runs found. Please create a payroll run first.',
      businessId
    });
  } catch (error) {
    console.error('[Page Route Error] /payslips:', error);
    res.render('admin/payroll/payslips', {
      title: 'Payslips',
      user,
      active: 'payroll-payslips',
      activeGroup: 'payroll',
      payslips: [],
      error: error.message || 'Error loading payslips'
    });
  }
});

// Payslips view for a run
router.get('/payslips/:runId', async (req, res) => {
  const user = { firstName: req.user.firstName, lastName: req.user.lastName };
  const runId = Number(req.params.runId);
  const run = await PayrollRun.findByPk(runId);

  let payslips = [];
  if (runId) {
    try {
      payslips = await payslipService.list(runId);
    } catch (e) {
      console.error('Error listing payslips:', e.message);
    }
  }

  const periodDisplay = run ? `${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}` : '';

  res.render('admin/payroll/payslips', {
    title: 'Payslips',
    user,
    active: 'payroll-payslips',
    activeGroup: 'payroll',
    runId,
    periodDisplay,
    payslips
  });
});

// Statutory reports page
router.get('/statutory', async (req, res) => {
  const user = { firstName: req.user.firstName, lastName: req.user.lastName };
  const businessId = await resolveBusinessId(req);
  const runIdParam = Number(req.query.runId) || null;
  let selectedRun = null;
  let allRuns = [];

  if (businessId) {
    // Fetch all runs for dropdown
    try {
      allRuns = await PayrollRun.findAll({
        where: { businessId },
        order: [['periodYear', 'DESC'], ['periodMonth', 'DESC']],
        attributes: ['id', 'periodMonth', 'periodYear', 'status'],
        raw: true,
      });
    } catch (e) {
      console.error('Error fetching all runs for statutory dropdown:', e.message);
    }

    if (runIdParam) {
      try {
        selectedRun = await PayrollRun.findOne({ where: { id: runIdParam, businessId } });
      } catch (e) {
        console.error('Error fetching PayrollRun by PK:', e.message);
        selectedRun = null;
      }
    } else {
      try {
        // Prefer a Locked run, but if none exist, fall back to the most recent run
        selectedRun = await PayrollRun.findOne({ where: { businessId, status: 'Locked' }, order: [['createdAt', 'DESC']] });
        if (!selectedRun) {
          selectedRun = await PayrollRun.findOne({ where: { businessId }, order: [['createdAt', 'DESC']] });
        }
      } catch (e) {
        console.error('Error fetching latest payroll run for statutory:', e.message);
        selectedRun = null;
      }
    }
  }

  let summary = null;
  let compliance = null;

  if (selectedRun) {
    try {
      summary = await statutoryService.getStatutorySummary(selectedRun.id);
    } catch (e) {
      console.warn('Statutory summary generation skipped:', e.message);
    }

    try {
      compliance = await statutoryService.getComplianceStatus(businessId, selectedRun.id);
    } catch (e) {
      console.warn('Compliance status fetch skipped:', e.message);
    }
  }

  res.render('admin/payroll/statutory', {
    title: 'Statutory Reports',
    user,
    active: 'payroll-statutory',
    activeGroup: 'payroll',
    pfSummary: summary?.pfSummary || null,
    esiSummary: summary?.esiSummary || null,
    ptSummary: summary?.ptSummary || null,
    tdsSummary: summary?.tdsSummary || null,
    periodDisplay: summary?.periodDisplay || new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    selectedRunId: selectedRun ? selectedRun.id : null,
    allRuns: JSON.stringify(allRuns),
    compliance: compliance ? JSON.stringify(compliance) : 'null',
    businessId,
  });
});

// Payroll queries
router.get('/queries', async (req, res) => {
  const user = { firstName: req.user.firstName, lastName: req.user.lastName };
  const businessId = await resolveBusinessId(req);
  let queries = [];
  let stats = { total: 0, pending: 0, inProgress: 0, resolved: 0, closed: 0 };
  if (businessId) {
    try {
      queries = await payrollQueryService.listQueries(businessId);
      stats = await payrollQueryService.getQueryStats(businessId);
    } catch (e) {
      console.error('Error fetching payroll queries:', e && e.message ? e.message : e);
      queries = [];
    }
  }
  res.render('admin/payroll/queries', { 
    title: 'Payroll Queries', 
    user, 
    active: 'payroll-queries', 
    activeGroup: 'payroll', 
    queries: JSON.stringify(queries),
    stats: JSON.stringify(stats),
    businessId 
  });
});

// API: Get all queries
router.get('/api/queries', async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req);
    if (!businessId) {
      return res.status(400).json({ success: false, message: 'Business ID required' });
    }
    
    const { status, category } = req.query;
    const queries = await payrollQueryService.listQueries(businessId, { status, category });
    const stats = await payrollQueryService.getQueryStats(businessId);
    
    res.json({ success: true, queries, stats });
  } catch (error) {
    console.error('Error fetching queries:', error);
    res.status(500).json({ success: false, message: 'Error fetching queries' });
  }
});

// API: Get single query
router.get('/api/queries/:id', async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req);
    const query = await payrollQueryService.getQueryById(Number(req.params.id), businessId);
    
    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }
    
    res.json({ success: true, query });
  } catch (error) {
    console.error('Error fetching query:', error);
    res.status(500).json({ success: false, message: 'Error fetching query' });
  }
});

// API: Resolve query
router.post('/api/queries/:id/resolve', async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req);
    const { resolutionNotes, status } = req.body;
    const userId = req.user.id;
    
    if (!resolutionNotes) {
      return res.status(400).json({ success: false, message: 'Resolution notes are required' });
    }
    
    const query = await payrollQueryService.resolveQuery(
      Number(req.params.id), 
      userId, 
      resolutionNotes, 
      status || 'Resolved'
    );
    
    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }
    
    res.json({ success: true, message: 'Query resolved successfully', query });
  } catch (error) {
    console.error('Error resolving query:', error);
    res.status(500).json({ success: false, message: 'Error resolving query' });
  }
});

// API: Update query status
router.patch('/api/queries/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['Pending', 'In Progress', 'Resolved', 'Closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid status required' });
    }
    
    const query = await payrollQueryService.updateQueryStatus(Number(req.params.id), status);
    
    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }
    
    res.json({ success: true, message: 'Status updated', query });
  } catch (error) {
    console.error('Error updating query status:', error);
    res.status(500).json({ success: false, message: 'Error updating status' });
  }
});

export default router;
export { router as adminPayrollPagesRouter };

// --- Debug helpers (authenticated) ---
router.get('/debug/run/:runId', async (req, res) => {
  const runId = Number(req.params.runId);
  try {
    const { PayrollRunItem } = await import('../models/index.js').then(m => m);
    const items = await PayrollRunItem.findAll({ where: { payrollRunId: runId } });
    const count = items.length;
    const totalDeductions = items.reduce((s, it) => s + (it.deductions ? (Number(it.deductions.PF||0) + Number(it.deductions.ESI||0) + Number(it.deductions.TDS||0) + Number(it.deductions.PT||0)) : 0), 0);
    return res.json({ success: true, runId, count, totalDeductions });
  } catch (e) {
    console.error('Debug run error', e);
    return res.status(500).json({ success: false, message: e.message || String(e) });
  }
});

router.get('/debug/structures', async (req, res) => {
  try {
    const { SalaryStructure, EmployeeSalaryAssignment } = await import('../models/index.js').then(m => m);
    const structs = await SalaryStructure.findAll();
    const result = [];
    for (const s of structs) {
      const assigned = await EmployeeSalaryAssignment.count({ where: { salaryStructureId: s.id } });
      result.push({ id: s.id, name: s.name, assignedCount: assigned, components: s.components || [] });
    }
    return res.json({ success: true, structures: result });
  } catch (e) {
    console.error('Debug structures error', e);
    return res.status(500).json({ success: false, message: e.message || String(e) });
  }
});
