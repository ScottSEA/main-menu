const express = require('express');
const { getDb } = require('../db/schema');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Initialize Stripe only if key is configured
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const isStripeConfigured = STRIPE_KEY && !STRIPE_KEY.startsWith('sk_test_placeholder');
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

let stripe;
if (isStripeConfigured) {
  stripe = require('stripe')(STRIPE_KEY);
}

const PLANS = {
  starter: {
    name: 'Starter',
    price_monthly: 999, // $9.99
    menus: 1,
    features: ['1 restaurant', '1 menu', 'Classic template', 'Custom colors'],
  },
  pro: {
    name: 'Pro',
    price_monthly: 2499, // $24.99
    menus: 5,
    features: ['3 restaurants', '5 menus', 'All templates', 'Custom fonts', 'Image uploads'],
  },
  business: {
    name: 'Business',
    price_monthly: 4999, // $49.99
    menus: -1, // unlimited
    features: ['Unlimited restaurants', 'Unlimited menus', 'All templates', 'Priority support', 'Animations'],
  },
};

// Get available plans
router.get('/plans', (req, res) => {
  res.json(PLANS);
});

// Get current subscription status
router.get('/status', authenticate, (req, res) => {
  const db = getDb();
  const sub = db.prepare(`
    SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(req.user.id);

  res.json({
    subscription: sub || { plan: 'free', status: 'active' },
    plans: PLANS,
  });
});

// Create checkout session
router.post('/checkout', authenticate, (req, res) => {
  if (!isStripeConfigured) {
    return res.status(503).json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to .env' });
  }

  const { plan } = req.body;
  if (!PLANS[plan]) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const db = getDb();
  let user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  // Create Stripe checkout session
  (async () => {
    try {
      // Ensure customer exists in Stripe
      if (!user.stripe_customer_id) {
        const customer = await stripe.customers.create({ email: user.email });
        db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customer.id, user.id);
        user.stripe_customer_id = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: user.stripe_customer_id,
        mode: 'subscription',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: `Main Menu ${PLANS[plan].name}` },
            unit_amount: PLANS[plan].price_monthly,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        metadata: { user_id: req.user.id, plan },
        success_url: `${APP_URL}/dashboard?subscribed=true`,
        cancel_url: `${APP_URL}/dashboard`,
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error('Stripe checkout error:', err);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  })();
});

// Manage subscription (customer portal)
router.post('/portal', authenticate, (req, res) => {
  if (!isStripeConfigured) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  if (!user.stripe_customer_id) {
    return res.status(400).json({ error: 'No subscription to manage' });
  }

  (async () => {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripe_customer_id,
        return_url: `${APP_URL}/dashboard`,
      });
      res.json({ url: session.url });
    } catch (err) {
      console.error('Stripe portal error:', err);
      res.status(500).json({ error: 'Failed to create portal session' });
    }
  })();
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!isStripeConfigured) {
    return res.status(503).send('Stripe not configured');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const db = getDb();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata.user_id;
      const plan = session.metadata.plan;
      const subscriptionId = session.subscription;

      // Update or create subscription
      const existing = db.prepare('SELECT id FROM subscriptions WHERE user_id = ?').get(userId);
      if (existing) {
        db.prepare(`
          UPDATE subscriptions SET stripe_subscription_id = ?, plan = ?, status = 'active', updated_at = datetime('now')
          WHERE user_id = ?
        `).run(subscriptionId, plan, userId);
      } else {
        const crypto = require('crypto');
        db.prepare(`
          INSERT INTO subscriptions (id, user_id, stripe_subscription_id, plan, status)
          VALUES (?, ?, ?, ?, 'active')
        `).run(crypto.randomUUID(), userId, subscriptionId, plan);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      db.prepare(`
        UPDATE subscriptions SET status = ?, current_period_end = ?, updated_at = datetime('now')
        WHERE stripe_subscription_id = ?
      `).run(subscription.status === 'active' ? 'active' : 'inactive', new Date(subscription.current_period_end * 1000).toISOString(), subscription.id);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      db.prepare(`
        UPDATE subscriptions SET status = 'cancelled', updated_at = datetime('now')
        WHERE stripe_subscription_id = ?
      `).run(subscription.id);
      break;
    }
  }

  res.json({ received: true });
});

module.exports = router;
