import {
  listCandidates,
  getCandidate,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  convertCandidateToEmployee,
} from '../services/candidate.service.js';
import Employee from '../models/Employee.js';
import { resolveOrganizationIdFromRequest } from '../services/organization.service.js';

export const renderCandidatesPage = async (req, res, next) => {
  try {
    const user = req.user
      ? { firstName: req.user.firstName, lastName: req.user.lastName, role: req.user.role }
      : {};
    res.render('candidates', {
      layout: 'main',
      title: 'Candidates',
      user,
      active: 'candidates',
      activeGroup: 'workspace',
    });
  } catch (err) {
    next(err);
  }
};

export const apiListCandidates = async (req, res, next) => {
  try {
    const businessId = await resolveOrganizationIdFromRequest(req);
    if (!businessId) return res.status(400).json({ error: 'No active organization' });

    const rows = await listCandidates(businessId, {
      status: req.query.status,
      search: req.query.search,
    });
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const apiGetCandidate = async (req, res, next) => {
  try {
    const businessId = await resolveOrganizationIdFromRequest(req);
    const row = await getCandidate(req.params.id, businessId);
    if (!row) return res.status(404).json({ error: 'Candidate not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
};

export const apiCreateCandidate = async (req, res, next) => {
  try {
    const businessId = await resolveOrganizationIdFromRequest(req);
    if (!businessId) return res.status(400).json({ error: 'No active organization' });

    const row = await createCandidate(businessId, req.body, req.user?.id);
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
};

export const apiUpdateCandidate = async (req, res, next) => {
  try {
    const businessId = await resolveOrganizationIdFromRequest(req);
    const row = await updateCandidate(req.params.id, businessId, req.body);
    res.json(row);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const apiDeleteCandidate = async (req, res, next) => {
  try {
    const businessId = await resolveOrganizationIdFromRequest(req);
    const result = await deleteCandidate(req.params.id, businessId);
    res.json(result);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const apiConvertCandidate = async (req, res, next) => {
  try {
    const businessId = await resolveOrganizationIdFromRequest(req);
    const result = await convertCandidateToEmployee(req.params.id, businessId, {
      reportingManagerId: req.body.reportingManagerId,
      userId: req.user?.id,
      actorUserId: req.user?.id,
    });
    res.json(result);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: err.errors?.[0]?.message || 'An employee with this contact information already exists',
      });
    }
    next(err);
  }
};

export const apiListManagersForConvert = async (req, res, next) => {
  try {
    const businessId = await resolveOrganizationIdFromRequest(req);
    const managers = await Employee.findAll({
      where: { businessId, employmentStatus: 'Active' },
      attributes: ['id', 'empName', 'empId', 'empDesignation'],
      order: [['empName', 'ASC']],
      limit: 200,
    });
    res.json(managers);
  } catch (err) {
    next(err);
  }
};
