import { Op } from 'sequelize';
import Employee from '../models/Employee.js';

const ACTIVE_STATUSES = ['Active', 'ACTIVE', 'active'];

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function daysBetween(from, to) {
  return Math.ceil((to - from) / (1000 * 60 * 60 * 24));
}

export async function getProbationEndingSoon(businessId, withinDays = 30) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const until = new Date(now);
  until.setDate(until.getDate() + withinDays);

  const employees = await Employee.findAll({
    where: {
      businessId,
      lifecycleStage: { [Op.in]: ['joining', 'active'] },
      employmentStatus: { [Op.in]: ACTIVE_STATUSES },
      probationPeriodMonths: { [Op.gt]: 0 },
      empDateOfJoining: { [Op.ne]: null },
    },
    attributes: ['id', 'empName', 'empId', 'empDateOfJoining', 'probationPeriodMonths', 'empDesignation'],
    raw: true,
  });

  return employees
    .map((emp) => {
      const start = new Date(emp.empDateOfJoining);
      if (isNaN(start.getTime())) return null;
      const end = addMonths(start, Number(emp.probationPeriodMonths) || 3);
      if (end < now || end > until) return null;
      return {
        id: emp.id,
        empName: emp.empName,
        empId: emp.empId,
        empDesignation: emp.empDesignation,
        probationEndDate: end.toISOString().slice(0, 10),
        daysRemaining: daysBetween(now, end),
        href: `/onboarding-workflow/${emp.id}`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export async function getContractEndingSoon(businessId, withinDays = 30) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const until = new Date(now);
  until.setDate(until.getDate() + withinDays);
  const untilStr = until.toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const employees = await Employee.findAll({
    where: {
      businessId,
      employeeType: { [Op.in]: ['Contract', 'Consultant'] },
      lifecycleStage: { [Op.notIn]: ['exited', 'offboarding'] },
      employmentStatus: { [Op.in]: ACTIVE_STATUSES },
      contractEndDate: {
        [Op.and]: [{ [Op.ne]: null }, { [Op.gte]: todayStr }, { [Op.lte]: untilStr }],
      },
    },
    attributes: ['id', 'empName', 'empId', 'contractEndDate', 'employeeType', 'empDesignation'],
    order: [['contractEndDate', 'ASC']],
    raw: true,
  });

  return employees.map((emp) => ({
    ...emp,
    daysRemaining: daysBetween(now, new Date(emp.contractEndDate)),
    href: `/contract-workflow/${emp.id}`,
  }));
}

export async function getExitsInProgress(businessId, limit = 10) {
  const rows = await Employee.findAll({
    where: { businessId, lifecycleStage: 'offboarding' },
    attributes: [
      'id',
      'empName',
      'empId',
      'lastWorkingDay',
      'exitType',
      'offboardingChecklist',
      'employeeType',
    ],
    order: [['lastWorkingDay', 'ASC']],
    limit,
    raw: true,
  });

  return rows.map((emp) => ({
    id: emp.id,
    empName: emp.empName,
    empId: emp.empId,
    lastWorkingDay: emp.lastWorkingDay,
    exitType: emp.exitType,
    href: `/exit-workflow/${emp.id}`,
  }));
}

export async function getLifecycleAlertsSummary(businessId) {
  const [probationEnding, contractEnding, exitsInProgress] = await Promise.all([
    getProbationEndingSoon(businessId),
    getContractEndingSoon(businessId),
    getExitsInProgress(businessId),
  ]);

  return {
    probationEnding,
    contractEnding,
    exitsInProgress,
    counts: {
      probationEnding: probationEnding.length,
      contractEnding: contractEnding.length,
      exitsInProgress: exitsInProgress.length,
    },
  };
}
