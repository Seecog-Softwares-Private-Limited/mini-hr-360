// src/services/billing.service.js
import razorpayService from './razorpay.service.js';
import { Plan } from '../models/Plan.js';
import { Subscription } from '../models/Subscription.js';
import { Invoice } from '../models/Invoice.js';
import { WebhookLog } from '../models/WebhookLog.js';
import { Business } from '../models/Business.js';
import { Op } from 'sequelize';

/**
 * Billing statuses
 */
export const BILLING_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  TRIALING: 'trialing'
});

/**
 * Generate unique invoice number
 */
function generateInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `INV-${year}${month}-${random}`;
}

/**
 * Map Razorpay webhook event to subscription status
 */
function mapEventToStatus(eventName) {
  const e = String(eventName || '').toLowerCase();

  if (e.includes('activated') || e.includes('paid') || e.includes('charged')) {
    return BILLING_STATUS.ACTIVE;
  }
  if (e.includes('failed') || e.includes('halted') || e.includes('past_due')) {
    return BILLING_STATUS.PAST_DUE;
  }
  if (e.includes('cancel')) {
    return BILLING_STATUS.CANCELLED;
  }
  if (e.includes('complete') || e.includes('expire')) {
    return BILLING_STATUS.EXPIRED;
  }

  return null;
}

/**
 * BillingService - Handles all billing operations
 */
class BillingService {
  constructor() {
    // Default plan catalog - can be synced from database
    this.planCatalog = [
      {
        code: 'starter',
        name: 'Starter',
        description: 'For small teams',
        price: 2499,
        amountPaise: 249900,
        currency: 'INR',
        interval: 'month',
        maxEmployees: 50,
        features: [
          'Up to 50 employees',
          'Leave management',
          'Document generation',
          'Email support'
        ]
      },
      {
        code: 'professional',
        name: 'Professional',
        description: 'Most popular',
        price: 6999,
        amountPaise: 699900,
        currency: 'INR',
        interval: 'month',
        maxEmployees: 200,
        features: [
          'Up to 200 employees',
          'Advanced leave management',
          'Custom document templates',
          'Priority support',
          'Advanced analytics'
        ]
      },
      {
        code: 'enterprise',
        name: 'Enterprise',
        description: 'For large organizations',
        price: 14999,
        amountPaise: 1499900,
        currency: 'INR',
        interval: 'month',
        maxEmployees: null, // unlimited
        features: [
          'Unlimited employees',
          'All features included',
          'Custom integrations',
          '24/7 dedicated support',
          'Advanced analytics',
          'Full API access'
        ]
      }
    ];
  }

  /**
   * Get all available plans
   */
  async getPlans() {
    // Try to get from database first
    const dbPlans = await Plan.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC'], ['price', 'ASC']]
    });

    if (dbPlans.length > 0) {
      return dbPlans;
    }

    // Return catalog plans if no DB plans
    return this.planCatalog;
  }

  /**
   * Get a plan by code
   */
  async getPlanByCode(planCode) {
    const plan = await Plan.findOne({ where: { code: planCode, isActive: true } });
    if (plan) return plan;

    // Fallback to catalog
    return this.planCatalog.find(p => p.code === planCode) || null;
  }

  /**
   * Sync plans to database and Razorpay
   */
  async syncPlansToDatabase() {
    const results = [];

    for (const planData of this.planCatalog) {
      const [plan, created] = await Plan.findOrCreate({
        where: { code: planData.code },
        defaults: {
          ...planData,
          features: JSON.stringify(planData.features)
        }
      });

      if (!created) {
        await plan.update({
          name: planData.name,
          description: planData.description,
          price: planData.price,
          amountPaise: planData.amountPaise,
          currency: planData.currency,
          interval: planData.interval,
          maxEmployees: planData.maxEmployees,
          features: JSON.stringify(planData.features)
        });
      }

      results.push({ code: plan.code, id: plan.id, created });
    }

    return results;
  }

  /**
   * Sync plans to Razorpay (for subscription-based billing)
   */
  async syncPlansToRazorpay() {
    if (!razorpayService.isConfigured()) {
      throw new Error('Razorpay not configured');
    }

    const results = [];
    const plans = await Plan.findAll({ where: { isActive: true } });

    for (const plan of plans) {
      if (plan.providerPlanId) {
        results.push({ code: plan.code, providerPlanId: plan.providerPlanId, synced: false });
        continue;
      }

      try {
        const razorpayPlan = await razorpayService.createPlan({
          name: plan.name,
          amountPaise: plan.amountPaise,
          currency: plan.currency,
          interval: plan.intervalCount || 1,
          period: plan.interval === 'year' ? 'yearly' : 'monthly',
          description: plan.description || ''
        });

        await plan.update({ providerPlanId: razorpayPlan.id });
        results.push({ code: plan.code, providerPlanId: razorpayPlan.id, synced: true });
      } catch (error) {
        console.error(`Failed to sync plan ${plan.code} to Razorpay:`, error);
        results.push({ code: plan.code, error: error.message, synced: false });
      }
    }

    return results;
  }

  // ========== ORDER-BASED PAYMENTS (One-time) ==========

  /**
   * Create an order for one-time payment
   */
  async createOrder({ businessId, planCode, customer }) {
    const plan = await this.getPlanByCode(planCode);
    if (!plan) {
      throw new Error(`Unknown plan: ${planCode}`);
    }

    const business = await Business.findByPk(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    const receipt = `order_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Create order in Razorpay
    const order = await razorpayService.createOrder({
      amountPaise: plan.amountPaise,
      currency: plan.currency || 'INR',
      receipt,
      notes: {
        businessId: String(businessId),
        planCode: planCode,
        planName: plan.name,
        customerName: customer.name,
        customerEmail: customer.email
      }
    });

    // Get plan ID (either from DB or find/create)
    let dbPlan = await Plan.findOne({ where: { code: planCode } });
    if (!dbPlan) {
      dbPlan = await Plan.create({
        code: plan.code,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        amountPaise: plan.amountPaise,
        currency: plan.currency,
        interval: plan.interval,
        maxEmployees: plan.maxEmployees,
        features: JSON.stringify(plan.features)
      });
    }

    // Create pending subscription
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await Subscription.create({
      businessId,
      planId: dbPlan.id,
      planCode,
      razorpayOrderId: order.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerContact: customer.contact,
      status: BILLING_STATUS.PENDING,
      totalCount: 1,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      nextBillingDate: periodEnd
    });

    // Get checkout configuration
    const checkout = razorpayService.getOrderCheckoutConfig({
      orderId: order.id,
      amountPaise: plan.amountPaise,
      currency: plan.currency || 'INR',
      name: 'Mini HR 360',
      description: `${plan.name} Plan`,
      customer
    });

    return {
      order,
      subscription,
      checkout,
      plan: {
        code: plan.code,
        name: plan.name,
        price: plan.price
      }
    };
  }

  /**
   * Verify payment after Razorpay checkout
   */
  async verifyPayment({ businessId, orderId, paymentId, signature }) {
    // Verify signature
    const isValid = razorpayService.verifyPaymentSignature({
      orderId,
      paymentId,
      signature
    });

    if (!isValid) {
      throw new Error('Invalid payment signature');
    }

    // Fetch payment details from Razorpay
    const payment = await razorpayService.fetchPayment(paymentId);

    // Find the subscription by order ID
    const subscription = await Subscription.findOne({
      where: { razorpayOrderId: orderId }
    });

    if (!subscription) {
      throw new Error('Subscription not found for this order');
    }

    // Verify business ownership
    if (subscription.businessId !== businessId) {
      throw new Error('Unauthorized');
    }

    // Update subscription to active
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await subscription.update({
      status: BILLING_STATUS.ACTIVE,
      razorpayPaymentId: paymentId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      nextBillingDate: periodEnd,
      billedCount: 1
    });

    // Create invoice record
    const invoice = await Invoice.create({
      invoiceNumber: generateInvoiceNumber(),
      subscriptionId: subscription.id,
      businessId,
      amount: payment.amount / 100, // Convert paise to rupees
      currency: payment.currency,
      status: 'paid',
      razorpayPaymentId: paymentId,
      razorpayOrderId: orderId,
      paymentMethod: payment.method,
      description: `Payment for ${subscription.planCode}`,
      issuedDate: now,
      paidDate: now
    });

    // Log the event
    await WebhookLog.create({
      eventId: `payment_${paymentId}`,
      eventType: 'payment.captured',
      provider: 'razorpay',
      payload: {
        payment_id: paymentId,
        order_id: orderId,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        email: payment.email,
        contact: payment.contact
      },
      processed: true,
      processedAt: now
    });

    return {
      verified: true,
      payment: {
        id: paymentId,
        amount: payment.amount / 100,
        currency: payment.currency,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        status: payment.status
      },
      subscription: await subscription.reload(),
      invoice
    };
  }

  // ========== SUBSCRIPTION MANAGEMENT ==========

  /**
   * Get current subscription for a business
   */
  async getSubscriptionForBusiness(businessId) {
    return Subscription.findOne({
      where: {
        businessId,
        status: {
          [Op.in]: [BILLING_STATUS.ACTIVE, BILLING_STATUS.TRIALING, BILLING_STATUS.PENDING]
        }
      },
      include: [{
        model: Plan,
        as: 'plan'
      }],
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Get all subscriptions for a business
   */
  async getAllSubscriptionsForBusiness(businessId) {
    return Subscription.findAll({
      where: { businessId },
      include: [{
        model: Plan,
        as: 'plan'
      }],
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription({ businessId, subscriptionId, cancelAtPeriodEnd = true }) {
    const subscription = await Subscription.findByPk(subscriptionId);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.businessId !== businessId) {
      throw new Error('Unauthorized');
    }

    // If it's a Razorpay subscription, cancel there too
    if (subscription.razorpaySubscriptionId && razorpayService.isConfigured()) {
      try {
        await razorpayService.cancelSubscription(
          subscription.razorpaySubscriptionId,
          cancelAtPeriodEnd
        );
      } catch (error) {
        console.error('Failed to cancel subscription in Razorpay:', error);
      }
    }

    // Update local subscription
    await subscription.update({
      cancelAtPeriodEnd,
      status: cancelAtPeriodEnd ? subscription.status : BILLING_STATUS.CANCELLED,
      cancelledAt: cancelAtPeriodEnd ? null : new Date()
    });

    return subscription.reload();
  }

  // ========== INVOICES ==========

  /**
   * Get invoices for a business
   */
  async getInvoicesForBusiness(businessId, options = {}) {
    const { limit = 10, offset = 0 } = options;

    return Invoice.findAndCountAll({
      where: { businessId },
      order: [['issuedDate', 'DESC']],
      limit,
      offset
    });
  }

  /**
   * Get a specific invoice
   */
  async getInvoice(invoiceId, businessId) {
    const invoice = await Invoice.findByPk(invoiceId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.businessId !== businessId) {
      throw new Error('Unauthorized');
    }

    return invoice;
  }

  // ========== WEBHOOKS ==========

  /**
   * Handle Razorpay webhook
   */
  async handleWebhook({ rawBody, signature }) {
    // Verify signature
    const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody.toString('utf8'));
    const eventName = event?.event || 'unknown';
    const eventId = event?.id || event?.event_id || `${eventName}:${event?.created_at || Date.now()}`;

    // Check if already processed
    const existingLog = await WebhookLog.findOne({ where: { eventId } });
    if (existingLog?.processed) {
      return { ignored: true, event: eventName };
    }

    // Extract subscription/payment info
    const payload = event?.payload || {};
    const subscriptionId = 
      payload?.subscription?.entity?.id ||
      payload?.subscription?.id ||
      payload?.invoice?.entity?.subscription_id ||
      payload?.payment?.entity?.subscription_id ||
      null;

    const newStatus = mapEventToStatus(eventName);

    // Update subscription if found
    if (subscriptionId) {
      const subscription = await Subscription.findOne({
        where: { razorpaySubscriptionId: subscriptionId }
      });

      if (subscription) {
        const updates = {};

        if (newStatus) {
          updates.status = newStatus;
        }

        if (newStatus === BILLING_STATUS.CANCELLED) {
          updates.cancelledAt = new Date();
        }

        // Update period from subscription payload
        const subEntity = payload?.subscription?.entity;
        if (subEntity?.current_start) {
          updates.currentPeriodStart = new Date(subEntity.current_start * 1000);
        }
        if (subEntity?.current_end) {
          updates.currentPeriodEnd = new Date(subEntity.current_end * 1000);
        }

        if (Object.keys(updates).length > 0) {
          await subscription.update(updates);
        }
      }
    }

    // Log the webhook
    await WebhookLog.upsert({
      eventId,
      eventType: eventName,
      provider: 'razorpay',
      payload: event,
      processed: true,
      processedAt: new Date()
    });

    return {
      processed: true,
      event: eventName,
      subscriptionId,
      status: newStatus || 'NO_CHANGE'
    };
  }

  // ========== USAGE & LIMITS ==========

  /**
   * Check if a business has exceeded their plan limits
   */
  async checkPlanLimits(businessId, checkType = 'employees') {
    const subscription = await this.getSubscriptionForBusiness(businessId);

    if (!subscription) {
      // No subscription - use free tier limits
      return {
        allowed: true,
        limit: 10,
        current: 0,
        isFreeTier: true
      };
    }

    const plan = subscription.plan || await this.getPlanByCode(subscription.planCode);
    
    if (!plan) {
      return { allowed: true, limit: null, current: 0 };
    }

    // For now, just return the limit info
    // Actual usage counting would need Employee model integration
    return {
      allowed: true,
      limit: plan.maxEmployees,
      current: 0,
      planCode: plan.code
    };
  }
}

// Export singleton instance
const billingService = new BillingService();
export { billingService, BillingService };
export default billingService;
