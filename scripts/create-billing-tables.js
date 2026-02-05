// scripts/create-billing-tables.js
// Run: node -r dotenv/config scripts/create-billing-tables.js DOTENV_CONFIG_PATH=./property.env

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: './property.env' });

const createBillingTables = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log('Creating billing tables...\n');

    // Drop existing billing tables if they exist (in correct order due to FK constraints)
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('DROP TABLE IF EXISTS invoices');
    await connection.query('DROP TABLE IF EXISTS subscriptions');
    await connection.query('DROP TABLE IF EXISTS plans');
    await connection.query('DROP TABLE IF EXISTS webhook_logs');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Dropped existing billing tables (if any)');

    // Create plans table - matches Plan.js model exactly
    await connection.query(`
      CREATE TABLE plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        amountPaise INT NOT NULL DEFAULT 0,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        \`interval\` VARCHAR(20) DEFAULT 'month',
        intervalCount INT NOT NULL DEFAULT 1,
        features JSON DEFAULT NULL,
        maxEmployees INT DEFAULT NULL,
        providerPlanId VARCHAR(100) DEFAULT NULL,
        isActive TINYINT(1) NOT NULL DEFAULT 1,
        sortOrder INT NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created plans table');

    // Create subscriptions table - matches Subscription.js model exactly
    await connection.query(`
      CREATE TABLE subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        businessId INT NOT NULL,
        planId INT NOT NULL,
        planCode VARCHAR(100) NOT NULL,
        razorpaySubscriptionId VARCHAR(100) DEFAULT NULL,
        razorpayOrderId VARCHAR(100) DEFAULT NULL,
        razorpayPaymentId VARCHAR(100) DEFAULT NULL,
        razorpayCustomerId VARCHAR(100) DEFAULT NULL,
        customerName VARCHAR(200) DEFAULT NULL,
        customerEmail VARCHAR(200) DEFAULT NULL,
        customerContact VARCHAR(50) DEFAULT NULL,
        status ENUM('pending', 'active', 'past_due', 'cancelled', 'expired', 'trialing') NOT NULL DEFAULT 'pending',
        totalCount INT NOT NULL DEFAULT 12,
        billedCount INT NOT NULL DEFAULT 0,
        currentPeriodStart DATETIME DEFAULT NULL,
        currentPeriodEnd DATETIME DEFAULT NULL,
        nextBillingDate DATETIME DEFAULT NULL,
        cancelAtPeriodEnd TINYINT(1) NOT NULL DEFAULT 0,
        cancelledAt DATETIME DEFAULT NULL,
        trialEndsAt DATETIME DEFAULT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (businessId) REFERENCES businesses(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (planId) REFERENCES plans(id) ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX idx_business (businessId),
        INDEX idx_status (status),
        INDEX idx_razorpay_order (razorpayOrderId),
        INDEX idx_razorpay_sub (razorpaySubscriptionId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created subscriptions table');

    // Create invoices table - matches Invoice.js model exactly
    await connection.query(`
      CREATE TABLE invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoiceNumber VARCHAR(50) NOT NULL UNIQUE,
        subscriptionId INT NOT NULL,
        businessId INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        status ENUM('draft', 'issued', 'paid', 'failed', 'refunded', 'cancelled') NOT NULL DEFAULT 'issued',
        razorpayPaymentId VARCHAR(100) DEFAULT NULL,
        razorpayInvoiceId VARCHAR(100) DEFAULT NULL,
        razorpayOrderId VARCHAR(100) DEFAULT NULL,
        paymentMethod VARCHAR(50) DEFAULT NULL,
        description TEXT DEFAULT NULL,
        dueDate DATETIME DEFAULT NULL,
        issuedDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        paidDate DATETIME DEFAULT NULL,
        failedDate DATETIME DEFAULT NULL,
        refundedDate DATETIME DEFAULT NULL,
        metadata JSON DEFAULT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (subscriptionId) REFERENCES subscriptions(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (businessId) REFERENCES businesses(id) ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX idx_business (businessId),
        INDEX idx_subscription (subscriptionId),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created invoices table');

    // Create webhook_logs table - matches WebhookLog.js model exactly
    await connection.query(`
      CREATE TABLE webhook_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        eventId VARCHAR(100) NOT NULL UNIQUE,
        eventType VARCHAR(100) NOT NULL,
        provider VARCHAR(50) NOT NULL DEFAULT 'razorpay',
        payload JSON DEFAULT NULL,
        processed TINYINT(1) NOT NULL DEFAULT 0,
        processedAt DATETIME DEFAULT NULL,
        error TEXT DEFAULT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_event_type (eventType),
        INDEX idx_processed (processed)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created webhook_logs table');

    // Insert default plans
    await connection.query(`
      INSERT INTO plans (code, name, description, price, amountPaise, currency, \`interval\`, maxEmployees, features, isActive, sortOrder) VALUES
      ('starter', 'Starter', 'Perfect for small teams', 2499.00, 249900, 'INR', 'month', 10, '["Up to 10 employees", "Basic HR features", "Email support"]', 1, 1),
      ('professional', 'Professional', 'For growing businesses', 6999.00, 699900, 'INR', 'month', 50, '["Up to 50 employees", "Advanced HR features", "Leave management", "Priority support"]', 1, 2),
      ('enterprise', 'Enterprise', 'For large organizations', 14999.00, 1499900, 'INR', 'month', NULL, '["Unlimited employees", "All features", "Custom integrations", "Dedicated support"]', 1, 3)
    `);
    console.log('✅ Inserted default plans');

    console.log('\n🎉 All billing tables created successfully!');

  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  } finally {
    await connection.end();
  }
};

createBillingTables();
