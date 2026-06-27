import {
  listPendingApprovals,
  getApprovalRequest,
  approveDocumentRequest,
  rejectDocumentRequest,
  readPendingPdf,
} from '../services/documentApproval.service.js';
import { resolveOrganizationIdFromRequest } from '../services/organization.service.js';

export const renderDocumentApprovalsPage = async (req, res, next) => {
  try {
    const user = req.user
      ? { firstName: req.user.firstName, lastName: req.user.lastName, role: req.user.role }
      : {};
    res.render('documentApprovals', {
      layout: 'main',
      title: 'Document Approvals',
      user,
      active: 'documentApprovals',
      activeGroup: 'workspace',
    });
  } catch (err) {
    next(err);
  }
};

export const apiListApprovals = async (req, res, next) => {
  try {
    const businessId = await resolveOrganizationIdFromRequest(req);
    if (!businessId) return res.status(400).json({ error: 'No active organization' });

    const status = req.query.status || 'pending';
    const rows = await listPendingApprovals(businessId, { status });
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const apiGetApproval = async (req, res, next) => {
  try {
    const businessId = await resolveOrganizationIdFromRequest(req);
    const row = await getApprovalRequest(req.params.id, businessId);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
};

export const apiApproveDocument = async (req, res, next) => {
  try {
    const businessId = await resolveOrganizationIdFromRequest(req);
    const result = await approveDocumentRequest(req.params.id, businessId, {
      reviewedByUserId: req.user?.id,
      reviewNote: req.body.reviewNote,
    });
    res.json({
      success: true,
      message: 'Document approved, emailed to employee, and saved to vault.',
      lifecycleStage: result.lifecycleStage,
      emailSent: result.emailSent,
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const apiRejectDocument = async (req, res, next) => {
  try {
    const businessId = await resolveOrganizationIdFromRequest(req);
    const row = await rejectDocumentRequest(req.params.id, businessId, {
      reviewedByUserId: req.user?.id,
      reviewNote: req.body.reviewNote,
    });
    res.json({ success: true, request: row });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const apiPreviewPendingPdf = async (req, res, next) => {
  try {
    const businessId = await resolveOrganizationIdFromRequest(req);
    const row = await getApprovalRequest(req.params.id, businessId);
    if (!row) return res.status(404).send('Not found');

    const buf = readPendingPdf(row);
    if (!buf) return res.status(410).send('PDF no longer available');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${row.fileName}"`);
    return res.send(buf);
  } catch (err) {
    next(err);
  }
};

export const apiPendingApprovalsCount = async (req, res, next) => {
  try {
    const businessId = await resolveOrganizationIdFromRequest(req);
    if (!businessId) return res.json({ count: 0 });
    const rows = await listPendingApprovals(businessId, { status: 'pending' });
    res.json({ count: rows.length });
  } catch (err) {
    next(err);
  }
};
