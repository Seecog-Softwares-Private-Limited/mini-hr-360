import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { assertSetupView } from '../middleware/setupAuthMiddleware.js';

export const renderSetupPage = asyncHandler(async (req, res, next) => {
  try {
    await assertSetupView(req);
    const user = {
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
    };
    return res.render('admin/company-setup', {
      title: 'Company Setup',
      user,
      active: 'companySetup',
      activeGroup: 'workspace',
      setupCanEdit: req.setupContext?.canEdit ?? false,
    });
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 403) {
      return res.status(403).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px"><h2>Access Denied</h2><p>You do not have permission to access company setup.</p><a href="/dashboard">Back to Dashboard</a></body></html>`);
    }
    return next(err);
  }
});
