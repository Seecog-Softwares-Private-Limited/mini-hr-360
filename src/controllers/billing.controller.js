// src/controllers/billing.controller.js
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /billing - Render billing and plans page
 */
export const renderBillingPage = asyncHandler(async (req, res) => {
  const user = req.user;

  res.render('billing', {
    title: 'Billing & Plans',
    user,
    active: 'billing',
    layout: 'main',
  });
});

export default {
  renderBillingPage,
};
