import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';

console.log("🚀 Codevora Backend: Starting initialization...");
dotenv.config();
console.log("✅ DOTENV Config Loaded.");
console.log("Stripe Key Present:", !!process.env.STRIPE_SECRET_KEY);

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
console.log("✅ Stripe Client Initialized.");

// Webhook handling must be BEFORE express.json() for Stripe signatures!
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle subscription update events
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    const priceId = session.line_items?.data[0]?.price?.id;

    console.log(`[STRIPE] Checkout completed for User: ${userId}, Price: ${priceId}`);
    // UPDATE Firestore DB to subscriptionStatus = 'active'
    // ... insert Firestore Admin SDK logic
  }

  res.json({ received: true });
});

// Regular Middleware
app.use(cors());
app.use(express.json());

// 💰 Checkout Session Route
app.post('/api/stripe/create-checkout', async (req, res) => {
  const { priceId, userId, successUrl, cancelUrl } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId, // Tied back to auth.currentUser.uid in Webhook!
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📊 Admin Usage Tracker (Credits/Limits aggregation placeholder)
app.get('/api/admin/metrics', (req, res) => {
  res.json({
    totalUsers: 142,
    activeSubscribers: 45,
    todayQueries: 1204,
    monthlyRevenue: 1305.00
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Codevora AI Backend running on port ${PORT}`);
});
