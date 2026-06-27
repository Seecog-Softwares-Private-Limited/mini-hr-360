import { Op } from 'sequelize';
import Candidate from '../models/Candidate.js';
import Employee from '../models/Employee.js';
import EmployeeLifecycleEvent from '../models/EmployeeLifecycleEvent.js';

export async function listCandidates(businessId, { status, search } = {}) {
  const where = { businessId };
  if (status) where.status = status;

  if (search) {
    const q = `%${search.trim()}%`;
    where[Op.or] = [
      { firstName: { [Op.like]: q } },
      { lastName: { [Op.like]: q } },
      { email: { [Op.like]: q } },
      { designation: { [Op.like]: q } },
    ];
  }

  return Candidate.findAll({
    where,
    order: [['createdAt', 'DESC']],
  });
}

export async function getCandidate(id, businessId) {
  return Candidate.findOne({ where: { id, businessId } });
}

export async function createCandidate(businessId, payload, createdByUserId) {
  return Candidate.create({
    businessId,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: String(payload.email).trim().toLowerCase(),
    phone: payload.phone || null,
    employeeType: payload.employeeType || 'Permanent',
    designation: payload.designation || null,
    department: payload.department || null,
    expectedCtc: payload.expectedCtc != null ? Number(payload.expectedCtc) : null,
    internStipend: payload.internStipend != null ? Number(payload.internStipend) : null,
    tentativeJoiningDate: payload.tentativeJoiningDate || null,
    workLocation: payload.workLocation || null,
    source: payload.source || null,
    status: payload.status || 'prospect',
    notes: payload.notes || null,
    createdByUserId,
  });
}

export async function updateCandidate(id, businessId, payload) {
  const candidate = await getCandidate(id, businessId);
  if (!candidate) {
    const err = new Error('Candidate not found');
    err.statusCode = 404;
    throw err;
  }

  const fields = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'employeeType',
    'designation',
    'department',
    'expectedCtc',
    'internStipend',
    'tentativeJoiningDate',
    'workLocation',
    'source',
    'status',
    'notes',
  ];

  fields.forEach((key) => {
    if (payload[key] !== undefined) {
      if (key === 'email') candidate[key] = String(payload[key]).trim().toLowerCase();
      else if (key === 'expectedCtc' || key === 'internStipend') {
        candidate[key] = payload[key] != null ? Number(payload[key]) : null;
      } else candidate[key] = payload[key];
    }
  });

  await candidate.save();
  return candidate;
}

export async function deleteCandidate(id, businessId) {
  const candidate = await getCandidate(id, businessId);
  if (!candidate) {
    const err = new Error('Candidate not found');
    err.statusCode = 404;
    throw err;
  }
  if (candidate.status === 'converted') {
    const err = new Error('Cannot delete a converted candidate');
    err.statusCode = 400;
    throw err;
  }
  await candidate.destroy();
  return { deleted: true };
}

export async function convertCandidateToEmployee(id, businessId, { reportingManagerId, userId, actorUserId }) {
  const candidate = await getCandidate(id, businessId);
  if (!candidate) {
    const err = new Error('Candidate not found');
    err.statusCode = 404;
    throw err;
  }
  if (candidate.status === 'converted') {
    const err = new Error('Candidate already converted');
    err.statusCode = 400;
    throw err;
  }

  const managerId = Number(reportingManagerId);
  if (!Number.isFinite(managerId) || managerId <= 0) {
    const err = new Error('Reporting manager is required to convert candidate');
    err.statusCode = 400;
    throw err;
  }

  const manager = await Employee.findOne({
    where: { id: managerId, businessId },
  });
  if (!manager) {
    const err = new Error('Invalid reporting manager for this organization');
    err.statusCode = 400;
    throw err;
  }

  const empName = `${candidate.firstName} ${candidate.lastName}`.trim();
  const isIntern = candidate.employeeType === 'Intern';

  const employee = await Employee.create({
    businessId,
    userId: userId || null,
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    empName,
    empEmail: candidate.email,
    empPhone: candidate.phone || '0000000000',
    employeeType: candidate.employeeType || 'Permanent',
    empDesignation: candidate.designation || 'Unassigned',
    empDepartment: candidate.department || 'General',
    empWorkLoc: candidate.workLocation || 'Unassigned',
    empDateOfJoining: candidate.tentativeJoiningDate || new Date().toISOString().slice(0, 10),
    empDob: '1990-01-01',
    empCtc: isIntern ? 0 : Number(candidate.expectedCtc || 0),
    internStipend: isIntern ? Number(candidate.internStipend || 0) : null,
    reportingManagerId: managerId,
    employmentStatus: 'Active',
    lifecycleStage: 'prospect',
    workMode: 'On-site',
  });

  candidate.status = 'converted';
  candidate.convertedEmployeeId = employee.id;
  await candidate.save();

  await EmployeeLifecycleEvent.create({
    employeeId: employee.id,
    fromStage: null,
    toStage: 'prospect',
    action: 'candidate_converted',
    actorUserId,
    payload: { candidateId: candidate.id, candidateName: empName },
  });

  return { candidate, employee };
}
