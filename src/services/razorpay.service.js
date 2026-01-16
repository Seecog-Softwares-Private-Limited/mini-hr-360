// src/services/razorpay.service.js
import Razorpay from 'razorpay';
import crypto from 'crypto';

/**
 * RazorpayService - Handles all Razorpay API interactions
 */
class RazorpayService {
  constructor() {
    this.client = null;
    this.keyId = null;
    this.keySecret = null;
    this.webhookSecret = null;
    this.initialized = false;
  }

  /**
   * Initialize Razorpay client with credentials
   */
  initialize(config = {}) {
    this.keyId = config.keyId || process.env.RAZORPAY_KEY_ID;
    this.keySecret = config.keySecret || process.env.RAZORPAY_KEY_SECRET;
    this.webhookSecret = config.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!this.keyId || !this.keySecret) {
      console.warn('⚠️ Razorpay credentials not configured. Billing features will be disabled.');
      return false;
    }

    this.client = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret
    });

    this.initialized = true;
    console.log('✅ Razorpay initialized successfully');
    return true;
  }

  /**
   * Check if Razorpay is properly configured
   */
  isConfigured() {
    return this.initialized && this.client !== null;
  }

  // ========== ORDERS API (for one-time payments) ==========

  /**
   * Create a Razorpay order for one-time payment
   */
  async createOrder({ amountPaise, currency = 'INR', receipt, notes = {} }) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');

    return this.client.orders.create({
      amount: amountPaise,
      currency,
      receipt,
      notes
    });
  }

  /**
   * Fetch order details
   */
  async fetchOrder(orderId) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');
    return this.client.orders.fetch(orderId);
  }

  /**
   * Fetch payment details
   */
  async fetchPayment(paymentId) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');
    return this.client.payments.fetch(paymentId);
  }

  /**
   * Verify payment signature for orders
   */
  verifyPaymentSignature({ orderId, paymentId, signature }) {
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');
    return expectedSignature === signature;
  }

  /**
   * Get checkout configuration for frontend
   */
  getOrderCheckoutConfig({ orderId, amountPaise, currency = 'INR', name, description, customer = {} }) {
    return {
      key: this.keyId,
      order_id: orderId,
      amount: amountPaise,
      currency,
      name: name || 'Mini HR 360',
      description,
      prefill: {
        name: customer.name || '',
        email: customer.email || '',
        contact: customer.contact || ''
      },
      theme: {
        color: '#667eea'
      }
    };
  }

  // ========== SUBSCRIPTIONS API (requires Razorpay Subscriptions enabled) ==========

  /**
   * Create a plan in Razorpay (for subscriptions)
   */
  async createPlan({ name, amountPaise, currency = 'INR', interval = 1, period = 'monthly', description = '' }) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');

    return this.client.plans.create({
      period,
      interval,
      item: {
        name,
        amount: amountPaise,
        currency,
        description
      }
    });
  }

  /**
   * Fetch a plan from Razorpay
   */
  async fetchPlan(planId) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');
    return this.client.plans.fetch(planId);
  }

  /**
   * Create a subscription
   */
  async createSubscription({ planId, totalCount = 12, notes = {}, customerId = null }) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');

    const subscriptionData = {
      plan_id: planId,
      customer_notify: 1,
      total_count: totalCount,
      notes
    };

    if (customerId) {
      subscriptionData.customer_id = customerId;
    }

    return this.client.subscriptions.create(subscriptionData);
  }

  /**
   * Fetch subscription details
   */
  async fetchSubscription(subscriptionId) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');
    return this.client.subscriptions.fetch(subscriptionId);
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId, cancelAtCycleEnd = true) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');
    return this.client.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
  }

  /**
   * Verify subscription payment signature
   */
  verifySubscriptionSignature({ subscriptionId, paymentId, signature }) {
    const body = `${paymentId}|${subscriptionId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');
    return expectedSignature === signature;
  }

  /**
   * Get checkout config for subscription
   */
  getSubscriptionCheckoutConfig({ subscriptionId, name = 'Mini HR 360', description = 'Subscription' }) {
    return {
      key: this.keyId,
      subscription_id: subscriptionId,
      name,
      description,
      theme: {
        color: '#667eea'
      }
    };
  }

  // ========== CUSTOMERS API ==========

  /**
   * Create a Razorpay customer
   */
  async createCustomer({ name, email, contact, notes = {} }) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');

    return this.client.customers.create({
      name,
      email,
      contact,
      notes
    });
  }

  /**
   * Fetch customer details
   */
  async fetchCustomer(customerId) {
    if (!this.isConfigured()) throw new Error('Razorpay not configured');
    return this.client.customers.fetch(customerId);
  }

  // ========== WEBHOOKS ==========

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(rawBody, signature) {
    if (!signature || !rawBody || !this.webhookSecret) return false;

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    return expectedSignature === signature;
  }
}

// Export singleton instance
const razorpayService = new RazorpayService();
export { razorpayService, RazorpayService };
export default razorpayService;
