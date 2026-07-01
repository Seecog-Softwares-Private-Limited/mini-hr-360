import { Op } from 'sequelize';
import {
  Employee,
  EmployeeBankDetail,
  EmployeeSalaryStructure,
  EmployeeSalaryAssignment,
  EmployeeShiftAssignment,
  EmployeeDocument,
  EmployeeLifecycleEvent,
  LeaveBalance,
  LeaveType,
  LeaveRequest,
  AttendanceRegularization,
  AttendanceLock,
  Shift,
  SalaryStructure,
  Payslip,
  PayrollRun,
  PayrollQuery,
} from '../models/index.js';
import { LIFECYCLE_STAGE_LABELS } from '../config/lifecycleWorkflows.js';
import { mergeChecklist, checklistProgress } from '../config/offboardingChecklist.js';
import { listGeneratedDocuments } from './generatedDocument.service.js';
import { getEmployeePayrollLinkStatus } from './payrollLifecycle.service.js';
import { syncPayrollForEmployee } from './employeeLifecycle.service.js';
import { getEmployeeBankDetails } from './employeeBank.service.js';
import { getEmployeeAttendanceHistory } from './attendance.service.js';
import { getJobChangeHistory } from './employeeJobChange.service.js';
import { listEmployeeAssets, getEmployeeAssetSummary } from './employeeAsset.service.js';
import { getEmployeeProfilePermissions } from './employeeProfilePermissions.service.js';
import AuditLog from '../models/AuditLog.js';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STAGE_ORDER = ['prospect', 'offer', 'joining', 'active', 'confirmed', 'offboarding', 'exited'];

const CHECKLIST_DEFS = [
  { key: 'add_employee', label: 'Add employee' },
  { key: 'collect_documents', label: 'Collect documents' },
  { key: 'assign_dept_designation', label: 'Assign department & designation' },
  { key: 'assign_manager', label: 'Assign manager' },
  { key: 'assign_shift', label: 'Assign shift' },
  { key: 'assign_leave_policy', label: 'Assign leave policy' },
  { key: 'assign_salary_structure', label: 'Assign salary structure' },
  { key: 'confirm_joining', label: 'Confirm joining' },
  { key: 'probation_tracking', label: 'Probation tracking' },
  { key: 'confirmation', label: 'Confirmation' },
  { key: 'salary_revision', label: 'Salary revision' },
  { key: 'promotion_transfer', label: 'Promotion / transfer' },
  { key: 'resignation', label: 'Resignation' },
  { key: 'exit_clearance', label: 'Exit clearance' },
  { key: 'fnf_settlement', label: 'Full & final settlement' },
];

function stageIndex(stage) {
  const idx = STAGE_ORDER.indexOf(stage || 'prospect');
  return idx >= 0 ? idx : 0;
}

function fmtDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function tabStatus(flag) {
  if (flag === 'complete') return 'good';
  if (flag === 'partial') return 'warning';
  return 'critical';
}

async function loadEmployeeCore(employeeId, businessId) {
  return Employee.findOne({
    where: { id: employeeId, businessId },
    include: [
      { model: EmployeeBankDetail, as: 'bankDetails', required: false },
      {
        model: EmployeeSalaryStructure,
        as: 'salaryStructures',
        required: false,
        separate: true,
        order: [['effectiveDate', 'DESC']],
        limit: 5,
      },
      {
        model: EmployeeShiftAssignment,
        as: 'shiftAssignments',
        required: false,
        include: [{ model: Shift, as: 'shift', attributes: ['id', 'name', 'startTime', 'endTime'] }],
        separate: true,
        order: [['effectiveFrom', 'DESC']],
        limit: 3,
      },
      {
        model: Employee,
        as: 'reportingManager',
        attributes: ['id', 'empName', 'empId'],
        required: false,
      },
    ],
  });
}

async function getLatestShiftAssignment(employeeId) {
  const today = new Date().toISOString().split('T')[0];
  return EmployeeShiftAssignment.findOne({
    where: {
      employeeId,
      effectiveFrom: { [Op.lte]: today },
      [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: today } }],
    },
    include: [{ model: Shift, as: 'shift', attributes: ['id', 'name', 'startTime', 'endTime'] }],
    order: [['effectiveFrom', 'DESC']],
  });
}

export async function buildLifecycleChecklist(employee, businessId) {
  const empId = employee.id;
  const stage = employee.lifecycleStage || 'prospect';
  const stageIdx = stageIndex(stage);

  const [docCount, generatedDocs, leaveBalanceCount, leaveTypeCount, shiftAssignment, salaryActive, lifecycleEvents] =
    await Promise.all([
      EmployeeDocument.count({ where: { employeeId: empId } }),
      listGeneratedDocuments(empId).catch(() => []),
      LeaveBalance.count({ where: { employeeId: empId } }),
      LeaveType.count({ where: { businessId, status: 'ACTIVE' } }),
      getLatestShiftAssignment(empId),
      EmployeeSalaryStructure.findOne({ where: { employeeId: empId, isActive: true } }),
      EmployeeLifecycleEvent.findAll({
        where: { employeeId: empId },
        order: [['createdAt', 'DESC']],
        limit: 20,
      }),
    ]);

  const hasDocuments = docCount > 0 || (generatedDocs?.length || 0) > 0;
  const hasDeptDesig = Boolean(employee.empDepartment && employee.empDesignation);
  const hasManager = Boolean(employee.reportingManagerId);
  const hasShift = Boolean(shiftAssignment);
  const hasLeavePolicy = leaveTypeCount === 0 || leaveBalanceCount > 0;
  const hasSalary = Boolean(salaryActive);
  const joined = stageIdx >= stageIndex('joining');
  const confirmed = stageIdx >= stageIndex('confirmed');
  const offboarding = stageIdx >= stageIndex('offboarding');

  const probationMonths = Number(employee.probationPeriodMonths || 0);
  const hasProbationConfig = probationMonths > 0 || employee.probationEndDate;

  const hasIncrement = lifecycleEvents.some(
    (e) => String(e.action || '').toLowerCase().includes('increment')
      || String(e.action || '').toLowerCase().includes('ctc')
  ) || Boolean(employee.empIncrementEffectiveDate);

  const hasPromotion = lifecycleEvents.some(
    (e) => /promotion|transfer/i.test(String(e.action || ''))
  );

  const checklist = mergeChecklist(employee.offboardingChecklist, employee.employeeType || 'Permanent');
  const clearance = checklistProgress(checklist);
  const fnf = employee.fnfSettlement && typeof employee.fnfSettlement === 'object'
    ? employee.fnfSettlement
    : null;
  const fnfDone = Boolean(fnf?.status === 'completed' || fnf?.settledAt || fnf?.processed);

  const evaluators = {
    add_employee: () => ({
      status: 'done',
      blocker: null,
      action: null,
    }),
    collect_documents: () => {
      if (hasDocuments) return { status: 'done', blocker: null, action: { label: 'View Documents', href: `/employees/${empId}?tab=documents` } };
      return {
        status: stageIdx <= stageIndex('offer') ? 'current' : 'blocked',
        blocker: 'Required documents not collected',
        action: { label: 'Collect Documents', href: `/documents?employeeId=${empId}` },
      };
    },
    assign_dept_designation: () => {
      if (hasDeptDesig) return { status: 'done', blocker: null, action: { label: 'View Job Details', href: `/employees/${empId}?tab=job` } };
      return {
        status: 'current',
        blocker: 'Department or designation missing',
        action: { label: 'Assign Now', href: `/employees?edit=${empId}` },
      };
    },
    assign_manager: () => {
      if (hasManager) return { status: 'done', blocker: null, action: null };
      return {
        status: hasDeptDesig ? 'current' : 'pending',
        blocker: 'Reporting manager not assigned',
        action: { label: 'Assign Manager', href: `/employees?edit=${empId}` },
      };
    },
    assign_shift: () => {
      if (hasShift) return { status: 'done', blocker: null, action: null };
      return {
        status: joined ? 'blocked' : 'pending',
        blocker: 'No active shift assignment',
        action: { label: 'Assign Shift', href: `/admin/attendance/assignments?employeeId=${empId}` },
      };
    },
    assign_leave_policy: () => {
      if (hasLeavePolicy) return { status: 'done', blocker: null, action: null };
      return {
        status: joined ? 'current' : 'pending',
        blocker: 'Leave balances not initialized',
        action: { label: 'Open Leave Balances', href: '/leave-requests/leave-balances' },
      };
    },
    assign_salary_structure: () => {
      if (hasSalary) return { status: 'done', blocker: null, action: { label: 'View Salary', href: `/employees/${empId}?tab=salary` } };
      return {
        status: joined ? 'blocked' : 'pending',
        blocker: 'Salary structure not assigned',
        action: { label: 'Assign Structure', href: '/admin/payroll/structures' },
      };
    },
    confirm_joining: () => {
      if (joined) return { status: 'done', blocker: null, action: { label: 'Onboarding', href: `/onboarding-workflow/${empId}` } };
      return {
        status: stage === 'offer' ? 'current' : 'pending',
        blocker: 'Joining not confirmed',
        action: { label: 'Confirm Joining', href: `/onboarding-workflow/${empId}` },
      };
    },
    probation_tracking: () => {
      if (confirmed || offboarding) return { status: 'done', blocker: null, action: null };
      if (!hasProbationConfig) {
        return { status: joined ? 'current' : 'pending', blocker: 'Probation period not configured', action: { label: 'Set Probation', href: `/employees?edit=${empId}` } };
      }
      return { status: stage === 'active' ? 'current' : 'done', blocker: null, action: { label: 'View Job Details', href: `/employees/${empId}?tab=job` } };
    },
    confirmation: () => {
      if (confirmed) return { status: 'done', blocker: null, action: null };
      return {
        status: stage === 'active' ? 'current' : 'pending',
        blocker: 'Employment not confirmed',
        action: { label: 'Confirm Employee', href: `/onboarding-workflow/${empId}` },
      };
    },
    salary_revision: () => {
      if (hasIncrement) return { status: 'done', blocker: null, action: null };
      return { status: confirmed ? 'pending' : 'pending', blocker: null, action: { label: 'Salary Revision', href: `/employees?edit=${empId}` } };
    },
    promotion_transfer: () => {
      if (hasPromotion) return { status: 'done', blocker: null, action: { label: 'View History', href: `/employees/${empId}?tab=job` } };
      return { status: 'pending', blocker: null, action: { label: 'Record Change', href: `/employees/${empId}?tab=job` } };
    },
    resignation: () => {
      if (offboarding) return { status: 'done', blocker: null, action: { label: 'Exit Workflow', href: `/exit-workflow/${empId}` } };
      if (employee.resignationDate) return { status: 'done', blocker: null, action: null };
      return { status: 'pending', blocker: null, action: { label: 'Initiate Exit', href: `/exit-workflow/${empId}` } };
    },
    exit_clearance: () => {
      if (stage === 'exited' || clearance.percent === 100) return { status: 'done', blocker: null, action: null };
      if (!offboarding) return { status: 'pending', blocker: null, action: null };
      return {
        status: 'current',
        blocker: `${clearance.total - clearance.done} clearance item(s) pending`,
        action: { label: 'Exit Clearance', href: `/exit-workflow/${empId}` },
      };
    },
    fnf_settlement: () => {
      if (fnfDone) return { status: 'done', blocker: null, action: null };
      if (!offboarding) return { status: 'pending', blocker: null, action: null };
      return {
        status: clearance.percent >= 80 ? 'current' : 'blocked',
        blocker: 'F&F settlement not completed',
        action: { label: 'F&F Settlement', href: `/exit-workflow/${empId}` },
      };
    },
  };

  const steps = CHECKLIST_DEFS.map((def) => {
    const result = evaluators[def.key]();
    return {
      key: def.key,
      label: def.label,
      status: result.status,
      blocker: result.blocker || null,
      action: result.action || null,
    };
  });

  const nextStep = steps.find((s) => s.status === 'current' || s.status === 'blocked') || null;
  const doneCount = steps.filter((s) => s.status === 'done').length;

  return {
    steps,
    summary: {
      done: doneCount,
      total: steps.length,
      percent: Math.round((doneCount / steps.length) * 100),
      nextStep,
    },
  };
}

export async function buildEmployeeTimeline(employeeId, businessId = null) {
  const [events, documents, auditLogs] = await Promise.all([
    EmployeeLifecycleEvent.findAll({
      where: { employeeId },
      order: [['createdAt', 'DESC']],
      limit: 30,
    }),
    listGeneratedDocuments(employeeId).catch(() => []),
    businessId
      ? AuditLog.findAll({
          where: { businessId, module: 'employee_profile' },
          order: [['createdAt', 'DESC']],
          limit: 40,
        })
      : Promise.resolve([]),
  ]);

  const items = [];

  events.forEach((e) => {
    items.push({
      id: `evt-${e.id}`,
      type: 'lifecycle',
      title: e.action?.replace(/_/g, ' ') || 'Lifecycle update',
      subtitle: e.fromStage && e.toStage
        ? `${LIFECYCLE_STAGE_LABELS[e.fromStage] || e.fromStage} → ${LIFECYCLE_STAGE_LABELS[e.toStage] || e.toStage}`
        : LIFECYCLE_STAGE_LABELS[e.toStage] || e.toStage,
      timestamp: e.createdAt,
      icon: 'fa-route',
    });
  });

  (documents || []).slice(0, 10).forEach((d) => {
    items.push({
      id: `doc-${d.id}`,
      type: 'document',
      title: d.documentType?.name || d.code || 'Document generated',
      subtitle: d.version ? `Version ${d.version}` : 'Generated document',
      timestamp: d.createdAt,
      icon: 'fa-file-lines',
      href: `/documents?employeeId=${employeeId}`,
    });
  });

  (auditLogs || [])
    .filter((log) => Number(log.newValue?.employeeId) === Number(employeeId)
      || Number(log.oldValue?.employeeId) === Number(employeeId))
    .forEach((log) => {
      items.push({
        id: `audit-${log.id}`,
        type: 'audit',
        title: String(log.action || 'Profile update').replace(/_/g, ' '),
        subtitle: 'Admin profile change',
        timestamp: log.createdAt,
        icon: 'fa-pen-to-square',
      });
    });

  items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return items.slice(0, 25).map((i) => ({
    ...i,
    timestamp: i.timestamp?.toISOString?.() || i.timestamp,
  }));
}

async function buildTabFlags(employee, businessId) {
  const empId = employee.id;
  const [docCount, shift, salary, bank, leaveBalCount, assetSummary] = await Promise.all([
    EmployeeDocument.count({ where: { employeeId: empId } }),
    getLatestShiftAssignment(empId),
    EmployeeSalaryStructure.findOne({ where: { employeeId: empId, isActive: true } }),
    EmployeeBankDetail.findOne({ where: { employeeId: empId } }),
    LeaveBalance.count({ where: { employeeId: empId } }),
    getEmployeeAssetSummary(empId, businessId).catch(() => ({ assigned: 0 })),
  ]);

  const hasBank = Boolean(bank?.accountNumber);
  const hasStatutory = Boolean(bank?.panNumber || bank?.uanNumber);

  return {
    profile: tabStatus(employee.empEmail && employee.empName ? 'complete' : 'partial'),
    job: tabStatus(employee.empDepartment && employee.empDesignation && employee.reportingManagerId ? 'complete' : (employee.empDepartment ? 'partial' : 'missing')),
    salary: tabStatus(salary ? 'complete' : 'missing'),
    bank: tabStatus(hasBank ? 'complete' : 'missing'),
    statutory: tabStatus(hasStatutory ? 'complete' : 'missing'),
    documents: tabStatus(docCount > 0 ? 'complete' : 'missing'),
    attendance: tabStatus(shift ? 'partial' : 'missing'),
    leave: tabStatus(leaveBalCount > 0 ? 'complete' : 'missing'),
    payroll: tabStatus(salary ? 'partial' : 'missing'),
    assets: tabStatus(assetSummary?.assigned > 0 ? 'partial' : 'missing'),
    performance: 'warning',
    timeline: 'good',
    exit: tabStatus(['offboarding', 'exited'].includes(employee.lifecycleStage) ? 'partial' : 'good'),
  };
}

function buildHero(employee) {
  const manager = employee.reportingManager;
  return {
    id: employee.id,
    empId: employee.empId,
    name: employee.empName,
    email: employee.empEmail,
    phone: employee.empPhone,
    designation: employee.empDesignation,
    department: employee.empDepartment,
    lifecycleStage: employee.lifecycleStage || 'prospect',
    lifecycleLabel: LIFECYCLE_STAGE_LABELS[employee.lifecycleStage] || employee.lifecycleStage,
    employmentStatus: employee.employmentStatus,
    isActive: employee.isActive !== false,
    employeeType: employee.employeeType || 'Permanent',
    dateOfJoining: employee.empDateOfJoining,
    profilePhoto: employee.profilePhoto || null,
    managerName: manager?.empName || null,
    managerId: manager?.id || null,
  };
}

export async function getEmployeeProfileOverview(employeeId, businessId, user = null) {
  const employee = await loadEmployeeCore(employeeId, businessId);
  if (!employee) return null;

  const plain = employee.get({ plain: true });
  const permissions = getEmployeeProfilePermissions(user);
  const [checklist, tabFlags, payrollLink] = await Promise.all([
    buildLifecycleChecklist(plain, businessId),
    buildTabFlags(plain, businessId),
    getEmployeePayrollLinkStatus(employeeId).catch(() => null),
  ]);

  const filteredTabFlags = Object.fromEntries(
    Object.entries(tabFlags).filter(([tab]) => permissions.visibleTabs.includes(tab))
  );

  return {
    hero: buildHero(plain),
    checklist,
    tabFlags: filteredTabFlags,
    payrollLink: permissions.canViewFinancial ? payrollLink : null,
    permissions,
  };
}

export async function getEmployeeProfileTabData(employeeId, businessId, tab, options = {}) {
  const employee = await loadEmployeeCore(employeeId, businessId);
  if (!employee) return null;

  const plain = employee.get({ plain: true });

  switch (tab) {
    case 'profile':
      return {
        personal: {
          fullName: plain.empName,
          dob: fmtDate(plain.empDob),
          gender: plain.gender,
          maritalStatus: plain.maritalStatus,
          bloodGroup: plain.bloodGroup,
          nationality: plain.nationality,
          email: plain.empEmail,
          phone: plain.empPhone,
          altPhone: plain.altPhone,
          presentAddress: [plain.presentAddressLine1, plain.presentCity, plain.presentState, plain.presentZip]
            .filter(Boolean)
            .join(', ') || null,
          permanentAddress: [plain.permanentAddressLine1, plain.permanentCity, plain.permanentState, plain.permanentZip]
            .filter(Boolean)
            .join(', ') || null,
        },
        emergency: {
          name: plain.emergencyContactName,
          relation: plain.emergencyContactRelation,
          phone: plain.emergencyContactNumber,
        },
        portal: {
          canLogin: plain.canLogin,
          role: plain.role,
        },
      };

    case 'job': {
      const jobChangeHistory = await getJobChangeHistory(employeeId);
      return {
        employeeType: plain.employeeType,
        department: plain.empDepartment,
        designation: plain.empDesignation,
        division: plain.division,
        subDepartment: plain.subDepartment,
        grade: plain.gradeBandLevel,
        manager: plain.reportingManager,
        workLocation: plain.empWorkLoc,
        workMode: plain.workMode,
        dateOfJoining: fmtDate(plain.empDateOfJoining),
        probationMonths: plain.probationPeriodMonths,
        confirmationDate: fmtDate(plain.confirmationDate),
        lifecycleStage: plain.lifecycleStage,
        employmentStatus: plain.employmentStatus,
        shiftAssignments: plain.shiftAssignments || [],
        jobChangeHistory,
        formDefaults: {
          empDesignation: plain.empDesignation,
          empDepartment: plain.empDepartment,
          division: plain.division,
          subDepartment: plain.subDepartment,
          gradeBandLevel: plain.gradeBandLevel,
          empWorkLoc: plain.empWorkLoc,
          workMode: plain.workMode,
          reportingManagerId: plain.reportingManagerId,
        },
      };
    }

    case 'documents': {
      const [uploaded, generated] = await Promise.all([
        EmployeeDocument.findAll({ where: { employeeId }, order: [['createdAt', 'DESC']], limit: 20 }),
        listGeneratedDocuments(employeeId).catch(() => []),
      ]);
      return {
        uploaded: uploaded.map((d) => d.get({ plain: true })),
        generated: generated || [],
      };
    }

    case 'timeline':
      return { items: await buildEmployeeTimeline(employeeId, businessId) };

    case 'exit': {
      const checklist = mergeChecklist(plain.offboardingChecklist, plain.employeeType || 'Permanent');
      return {
        resignationDate: fmtDate(plain.resignationDate),
        lastWorkingDay: fmtDate(plain.lastWorkingDay),
        noticePeriodDays: plain.noticePeriodDays,
        lifecycleStage: plain.lifecycleStage,
        checklist,
        checklistProgress: checklistProgress(checklist),
        fnfSettlement: plain.fnfSettlement || null,
      };
    }

    case 'salary': {
      const [payrollLink, assignments] = await Promise.all([
        getEmployeePayrollLinkStatus(employeeId).catch(() => null),
        EmployeeSalaryAssignment.findAll({
          where: { employeeId, businessId },
          include: [{ model: SalaryStructure, as: 'salaryStructure', attributes: ['id', 'name'] }],
          order: [['effectiveFrom', 'DESC']],
          limit: 5,
        }),
      ]);
      return {
        empCtc: plain.empCtc,
        empDateOfJoining: plain.empDateOfJoining,
        structures: plain.salaryStructures || [],
        assignments: assignments.map((a) => a.get({ plain: true })),
        payrollLink,
      };
    }

    case 'bank': {
      const bank = await getEmployeeBankDetails(employeeId);
      return { bank };
    }

    case 'statutory': {
      const bank = await getEmployeeBankDetails(employeeId);
      return {
        panNumber: bank?.panNumber,
        uanNumber: bank?.uanNumber,
        esiNumber: bank?.esiNumber,
        aadhaarNumber: bank?.aadhaarNumber,
        taxDeclarationStatus: bank?.taxDeclarationStatus || 'Not Submitted',
      };
    }

    case 'attendance': {
      const month = options.month || null;
      const [history, shift, regularizations, lock] = await Promise.all([
        getEmployeeAttendanceHistory({ businessId, employeeId, month }),
        getLatestShiftAssignment(employeeId),
        AttendanceRegularization.findAll({
          where: { businessId, employeeId },
          order: [['createdAt', 'DESC']],
          limit: 5,
        }),
        AttendanceLock.findOne({
          where: { businessId, period: month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` },
        }),
      ]);

      return {
        period: history.period,
        stats: history.stats,
        days: history.days.map((d) => d.get({ plain: true })),
        holidays: history.holidays.map((h) => h.get({ plain: true })),
        shift,
        regularizations: regularizations.map((r) => r.get({ plain: true })),
        monthLocked: !!lock,
      };
    }

    case 'leave': {
      const year = Number(options.year) || new Date().getFullYear();
      const [balances, requests] = await Promise.all([
        LeaveBalance.findAll({
          where: { employeeId, year },
          include: [{ model: LeaveType, as: 'leaveType', attributes: ['id', 'name'] }],
        }),
        LeaveRequest.findAll({
          where: { employeeId, businessId },
          include: [{ model: LeaveType, as: 'leaveType', attributes: ['id', 'name'] }],
          order: [['createdAt', 'DESC']],
          limit: 15,
        }),
      ]);

      const balanceRows = balances.map((b) => {
        const p = b.get({ plain: true });
        const allocated = Number(p.allocated) || 0;
        const carried = Number(p.carriedForward) || 0;
        const used = Number(p.used) || 0;
        const pending = Number(p.pending) || 0;
        return { ...p, available: allocated + carried - used - pending };
      });

      const requestStats = { pending: 0, approved: 0, rejected: 0, canceled: 0 };
      requests.forEach((r) => {
        const key = String(r.status || '').toLowerCase();
        if (key in requestStats) requestStats[key] += 1;
      });

      return {
        year,
        balances: balanceRows,
        requests: requests.map((r) => r.get({ plain: true })),
        requestStats,
      };
    }

    case 'payroll': {
      const currentYear = new Date().getFullYear();
      const [payrollLink, payslips, queries] = await Promise.all([
        getEmployeePayrollLinkStatus(employeeId).catch(() => null),
        Payslip.findAll({
          where: { employeeId },
          include: [{ model: PayrollRun, as: 'payrollRun', attributes: ['id', 'status', 'processedDate'] }],
          order: [['periodYear', 'DESC'], ['periodMonth', 'DESC']],
          limit: 12,
        }),
        PayrollQuery.findAll({
          where: { employeeId, businessId },
          order: [['createdAt', 'DESC']],
          limit: 8,
        }),
      ]);

      const payslipRows = payslips.map((p) => {
        const plain = p.get({ plain: true });
        return {
          id: plain.id,
          periodLabel: `${MONTH_SHORT[plain.periodMonth - 1] || plain.periodMonth} ${plain.periodYear}`,
          periodMonth: plain.periodMonth,
          periodYear: plain.periodYear,
          netPay: Number(plain.netPay) || 0,
          status: plain.status,
          pdfUrl: plain.pdfUrl,
          payrollRunId: plain.payrollRunId,
          processedDate: plain.payrollRun?.processedDate || plain.publishedAt,
        };
      });

      const ytdNetPay = payslipRows
        .filter((p) => p.periodYear === currentYear)
        .reduce((sum, p) => sum + p.netPay, 0);

      return {
        payrollLink,
        payslips: payslipRows,
        queries: queries.map((q) => q.get({ plain: true })),
        ytdNetPay,
        currentYear,
      };
    }

    case 'assets': {
      const [assets, summary] = await Promise.all([
        listEmployeeAssets(employeeId, businessId).catch(() => []),
        getEmployeeAssetSummary(employeeId, businessId).catch(() => ({ total: 0, assigned: 0, returned: 0, other: 0 })),
      ]);
      const checklist = mergeChecklist(plain.offboardingChecklist, plain.employeeType || 'Permanent');
      const itAsset = checklist.find((i) => i.key === 'it_assets');
      return {
        assets,
        summary,
        itAssetsChecklist: itAsset || null,
        assetTypes: ['Laptop', 'Mobile', 'Access Card', 'Monitor', 'Headset', 'Other'],
      };
    }

    case 'performance':
      return { placeholder: true, message: 'Performance module coming soon' };

    default:
      return null;
  }
}

export async function updateEmployeeProfileSalary(employeeId, { empCtc, syncPayroll } = {}) {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) throw new Error('Employee not found');

  if (empCtc != null && empCtc !== '') {
    const ctc = Number(empCtc);
    if (!Number.isFinite(ctc) || ctc < 0) {
      const err = new Error('Invalid CTC value');
      err.statusCode = 400;
      throw err;
    }
    employee.empCtc = ctc;
    await employee.save();
  }

  let syncResult = null;
  if (syncPayroll) {
    syncResult = await syncPayrollForEmployee(employeeId, {
      ctc: employee.empCtc,
      effectiveDate: employee.empDateOfJoining,
      reason: 'profile_sync',
    });
  }

  const payrollLink = await getEmployeePayrollLinkStatus(employeeId).catch(() => null);

  return {
    empCtc: employee.empCtc,
    syncResult,
    payrollLink,
  };
}
