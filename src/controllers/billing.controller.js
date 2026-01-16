// src/controllers/billing.controller.js
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Plan, Subscription, Invoice, WebhookLog, Business } from '../models/index.js';

// Initialize Razorpay (only if keys are provided)
let razorpay = null;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
  });
  console.log('✅ Razorpay initialized in billing controller');
} else {
  console.warn('⚠️ Razorpay keys not configured. Payment functionality will not work.');
}

/**
 * GET /billing - Render billing and plans page
 */
export const renderBillingPage = asyncHandler(async (req, res) => {
  const user = req.user;

  // Get user's business
  const business = await Business.findOne({ where: { ownerId: user.id } });
  
  // Get current subscription if exists
  let currentSubscription = null;
  if (business) {
    currentSubscription = await Subscription.findOne({
      where: { 
        businessId: business.id,
        status: 'active'
      },
      include: [{ model: Plan, as: 'plan' }],
      order: [['createdAt', 'DESC']]
    });
  }

  // Get available plans
  const plans = await Plan.findAll({ 
    where: { isActive: true },
    order: [['sortOrder', 'ASC']]
  });

  res.render('billing', {
    title: 'Billing & Plans',
    user,
    active: 'billing',
    layout: 'main',
    business,
    currentSubscription,
    plans: plans.map(p => p.toJSON()),
    razorpayKeyId: RAZORPAY_KEY_ID || '',
    isRazorpayConfigured: !!razorpay
  });
});

/**
 * GET /api/v1/billing/plans - Get all available plans
 */
export const getPlans = asyncHandler(async (req, res) => {
  const plans = await Plan.findAll({ 
    where: { isActive: true },
    order: [['sortOrder', 'ASC']]
  });
  
  res.json({
    success: true,
    data: plans.map(plan => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      price: parseFloat(plan.price),
      amountPaise: plan.amountPaise,
      currency: plan.currency || 'INR',
      interval: plan.interval || 'month',
      maxEmployees: plan.maxEmployees,
      features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features
    }))
  });
});

/**
 * POST /api/v1/billing/create-order - Create payment order
 */
export const createOrder = asyncHandler(async (req, res) => {
  console.log('[Billing] createOrder called with body:', req.body);
  
  if (!razorpay) {
    return res.status(500).json({
      success: false,
      message: 'Payment gateway not configured. Please contact support.'
    });
  }

  const { planId, customer } = req.body;
  const user = req.user;

  if (!planId) {
    return res.status(400).json({
      success: false,
      message: 'Plan ID is required'
    });
  }

  // Get user's business or create one if it doesn't exist
  let business = await Business.findOne({ where: { ownerId: user.id } });
  if (!business) {
    // Auto-create business for the user using customer details
    console.log('[Billing] Creating business for user:', user.id);
    business = await Business.create({
      businessName: customer?.name || user.firstName || user.email?.split('@')[0] || 'My Business',
      phoneNo: customer?.contact || null,
      ownerId: user.id,
      timezone: 'Asia/Kolkata',
      country: 'India'
    });
    console.log('[Billing] Business created:', business.id);
  }

  // Get plan details - support both ID and code
  let plan = await Plan.findByPk(planId);
  if (!plan) {
    plan = await Plan.findOne({ where: { code: planId } });
  }
  
  if (!plan) {
    return res.status(404).json({
      success: false,
      message: 'Plan not found'
    });
  }

  console.log('[Billing] Found plan:', plan.name, 'Amount:', plan.amountPaise);

  try {
    // Create Razorpay order
    const options = {
      amount: plan.amountPaise,
      currency: plan.currency || 'INR',
      receipt: `order_${business.id}_${plan.id}_${Date.now()}`,
      notes: {
        businessId: String(business.id),
        planId: String(plan.id),
        planCode: plan.code,
        planName: plan.name,
        customerName: customer?.name || user.firstName || '',
        customerEmail: customer?.email || user.email || ''
      }
    };

    console.log('[Billing] Creating Razorpay order with options:', options);

    const order = await razorpay.orders.create(options);

    console.log('[Billing] Razorpay order created:', order.id);

    // Create pending subscription record
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await Subscription.create({
      businessId: business.id,
      planId: plan.id,
      planCode: plan.code,
      razorpayOrderId: order.id,
      customerName: customer?.name || '',
      customerEmail: customer?.email || '',
      customerContact: customer?.contact || '',
      status: 'pending',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd
    });

    console.log('[Billing] Subscription created:', subscription.id);

    // Return checkout config
    return res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: RAZORPAY_KEY_ID,
        subscription: {
          id: subscription.id,
          planCode: plan.code
        },
        checkout: {
          key: RAZORPAY_KEY_ID,
          order_id: order.id,
          amount: order.amount,
          currency: order.currency,
          name: 'Mini HR 360',
          description: `${plan.name} Plan - Monthly`,
          prefill: {
            name: customer?.name || '',
            email: customer?.email || '',
            contact: customer?.contact || ''
          }
        },
        plan: {
          id: plan.id,
          code: plan.code,
          name: plan.name,
          price: parseFloat(plan.price)
        }
      },
      message: 'Payment order created successfully'
    });

  } catch (error) {
    console.error('[Billing] Error creating order:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment order'
    });
  }
});

/**
 * POST /api/v1/billing/verify - Verify payment and activate subscription
 */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;
  const user = req.user;

  console.log('[Billing] verifyPayment called:', { razorpay_order_id, razorpay_payment_id, planId });

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: 'Payment verification data is incomplete'
    });
  }

  // Verify payment signature
  const text = `${razorpay_order_id}|${razorpay_payment_id}`;
  const generatedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET || '')
    .update(text)
    .digest('hex');

  console.log('[Billing] Signature verification:', { 
    match: generatedSignature === razorpay_signature 
  });

  if (generatedSignature !== razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: 'Payment verification failed: Invalid signature'
    });
  }

  // Get user's business
  const business = await Business.findOne({ where: { ownerId: user.id } });
  if (!business) {
    return res.status(400).json({
      success: false,
      message: 'No business found for this user'
    });
  }

  // Find the pending subscription by order ID
  const subscription = await Subscription.findOne({
    where: { razorpayOrderId: razorpay_order_id }
  });

  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'Subscription not found for this order'
    });
  }

  // Get plan details
  const plan = await Plan.findByPk(subscription.planId);
  if (!plan) {
    return res.status(404).json({
      success: false,
      message: 'Plan not found'
    });
  }

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Deactivate any existing active subscriptions for this business
  await Subscription.update(
    { status: 'expired' },
    { where: { businessId: business.id, status: 'active' } }
  );

  // Activate the subscription
  await subscription.update({
    status: 'active',
    razorpayPaymentId: razorpay_payment_id,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    nextBillingDate: periodEnd
  });

  console.log('[Billing] Subscription activated:', subscription.id);

  // Create invoice
  const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  await Invoice.create({
    invoiceNumber,
    subscriptionId: subscription.id,
    businessId: business.id,
    amount: plan.price,
    currency: plan.currency || 'INR',
    status: 'paid',
    razorpayPaymentId: razorpay_payment_id,
    razorpayOrderId: razorpay_order_id,
    description: `${plan.name} Plan - Monthly Subscription`,
    issuedDate: now,
    paidDate: now
  });

  console.log('[Billing] Invoice created:', invoiceNumber);

  // Log webhook event for audit
  await WebhookLog.create({
    eventId: `payment_${razorpay_payment_id}`,
    eventType: 'payment.captured.manual',
    provider: 'razorpay',
    payload: JSON.stringify({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      planId: plan.id,
      businessId: business.id,
      amount: plan.amountPaise,
      timestamp: now.toISOString()
    }),
    processed: true,
    processedAt: now
  });

  return res.status(200).json({
    success: true,
    data: {
      subscription: {
        id: subscription.id,
        planCode: subscription.planCode,
        status: 'active',
        validUntil: periodEnd
      },
      payment: {
        id: razorpay_payment_id,
        orderId: razorpay_order_id
      }
    },
    message: 'Payment verified and subscription activated successfully'
  });
});

/**
 * GET /api/v1/billing/subscription - Get current subscription
 */
export const getCurrentSubscription = asyncHandler(async (req, res) => {
  const user = req.user;

  const business = await Business.findOne({ where: { ownerId: user.id } });
  if (!business) {
    return res.json({ success: true, data: { subscription: null } });
  }

  const subscription = await Subscription.findOne({
    where: { 
      businessId: business.id,
      status: 'active'
    },
    include: [{ model: Plan, as: 'plan' }],
    order: [['createdAt', 'DESC']]
  });

  return res.json({
    success: true,
    data: { 
      subscription: subscription ? {
        id: subscription.id,
        planCode: subscription.planCode,
        planName: subscription.plan?.name,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
      } : null 
    }
  });
});

/**
 * POST /api/v1/billing/subscription/:id/cancel - Cancel subscription
 */
export const cancelSubscription = asyncHandler(async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const { cancelAtPeriodEnd = true } = req.body;

  const business = await Business.findOne({ where: { ownerId: user.id } });
  if (!business) {
    return res.status(400).json({ success: false, message: 'No business found' });
  }

  const subscription = await Subscription.findOne({
    where: { id, businessId: business.id }
  });

  if (!subscription) {
    return res.status(404).json({ success: false, message: 'Subscription not found' });
  }

  if (cancelAtPeriodEnd) {
    await subscription.update({ cancelAtPeriodEnd: true });
  } else {
    await subscription.update({ 
      status: 'cancelled',
      cancelledAt: new Date()
    });
  }

  return res.json({
    success: true,
    data: { cancelled: true, cancelAtPeriodEnd },
    message: 'Subscription cancelled successfully'
  });
});

/**
 * GET /api/v1/billing/invoices - Get invoices
 */
export const getInvoices = asyncHandler(async (req, res) => {
  const user = req.user;
  const limit = parseInt(req.query.limit) || 20;

  const business = await Business.findOne({ where: { ownerId: user.id } });
  if (!business) {
    return res.json({ success: true, data: { invoices: [] } });
  }

  const invoices = await Invoice.findAll({
    where: { businessId: business.id },
    order: [['createdAt', 'DESC']],
    limit
  });

  return res.json({
    success: true,
    data: { 
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        currency: inv.currency,
        status: inv.status,
        description: inv.description,
        issuedDate: inv.issuedDate,
        paidDate: inv.paidDate
      }))
    }
  });
});

/**
 * POST /api/v1/billing/webhook/razorpay - Razorpay webhook handler
 */
export const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.body;

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
    .update(rawBody)
    .digest('hex');

  if (expectedSignature !== signature) {
    console.error('[Webhook] Invalid signature');
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }

  const event = JSON.parse(rawBody.toString('utf8'));
  const eventName = event?.event || 'unknown';
  const eventId = event?.id || `${eventName}:${Date.now()}`;

  console.log('[Webhook] Received:', eventName);

  // Check if already processed
  const existing = await WebhookLog.findOne({ where: { eventId } });
  if (existing) {
    return res.json({ success: true, message: 'Already processed' });
  }

  // Log the webhook
  await WebhookLog.create({
    eventId,
    eventType: eventName,
    provider: 'razorpay',
    payload: JSON.stringify(event),
    processed: true,
    processedAt: new Date()
  });

  return res.json({ success: true, message: 'Webhook processed' });
});
