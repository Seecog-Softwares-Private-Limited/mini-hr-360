// src/routes/billing.routes.js
import { Router } from 'express';
import express from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';
import {
  renderBillingPage,
  getPlans,
  createOrder,
  verifyPayment,
  getCurrentSubscription,
  cancelSubscription,
  getInvoices,
  handleRazorpayWebhook
} from '../controllers/billing.controller.js';

const router = Router();

// ========== WEBHOOK (must be before JSON middleware) ==========
// Razorpay webhook - needs raw body for signature verification
router.post(
  '/webhook/razorpay',
  express.raw({ type: 'application/json' }),
  handleRazorpayWebhook
);

// ========== PUBLIC API ROUTES ==========
// Get available plans (no auth required for display)
router.get('/plans', getPlans);

// ========== PROTECTED API ROUTES ==========
// All routes below require authentication
router.use(verifyUser);

// Billing page (frontend)
router.get('/', renderBillingPage);

// Create order for payment
router.post('/create-order', createOrder);

// Verify payment after checkout
router.post('/verify', verifyPayment);

// Get current subscription
router.get('/subscription', getCurrentSubscription);

// Cancel subscription
router.post('/subscription/:id/cancel', cancelSubscription);

// Get billing history (invoices)
router.get('/invoices', getInvoices);

export default router;
export { router as billingRouter };
