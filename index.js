const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

const app = express();
app.use(express.json()); // Parse JSON bodies

// Initialize Razorpay with credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Health check (Render needs something on "/")
app.get('/', (req, res) => {
  res.send('🚀 Payment API is running!');
});

// Create Razorpay order
app.post('/create-order', async (req, res) => {
  const { amount, itemId, currency } = req.body;

  if (!amount || !itemId || !currency) {
    console.log('Missing required fields:', { amount, itemId, currency });
    return res.status(400).json({ error: 'Amount, itemId, and currency are required' });
  }

  try {
    const order = await razorpay.orders.create({
      amount: amount, // Amount in paise
      currency: currency,
      receipt: `receipt_${itemId}`,
    });
    console.log('Order created:', order);
    res.status(200).json({ orderId: order.id });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Verify payment
app.post('/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    console.log('Missing payment details:', req.body);
    return res.status(400).json({ error: 'Missing payment details' });
  }

  try {
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      res.status(200).json({ success: true, message: 'Payment verified successfully' });
    } else {
      console.log('Invalid signature:', { generated_signature, razorpay_signature });
      res.status(400).json({ error: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Create Razorpay subscription
app.post('/create-subscription', async (req, res) => {
  const { name, email, contact } = req.body;

  if (!name || !email || !contact || !/^\d{10}$/.test(contact) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.log('Invalid subscription data:', { name, email, contact });
    return res.status(400).json({ error: 'Invalid name, email, or contact' });
  }

  try {
    console.log('Creating weekly subscription with:', { name, email, contact });
    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PLAN_ID, // Must be a weekly plan in Razorpay dashboard
      customer_notify: 1,
      total_count: 52, // 52 weeks for a year
      quantity: 1,
      notes: { name, email, contact },
      start_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // Start after 1 week
    });
    console.log('Subscription created:', subscription);
    res.status(200).json({
      subscription_id: subscription.id,
      short_url: subscription.short_url,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Fetch subscription payment history
app.get('/history/:subscriptionId', async (req, res) => {
  const { subscriptionId } = req.params;

  try {
    console.log('Fetching payment history for subscription:', subscriptionId);
    const payments = await razorpay.subscriptions.allPayments(subscriptionId);
    console.log('Payment history:', payments);
    res.status(200).json(payments.items);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Fetch subscription status
app.get('/subscription-status/:subscriptionId', async (req, res) => {
  const { subscriptionId } = req.params;
  try {
    console.log('Fetching subscription status:', subscriptionId);
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    console.log('Subscription status:', subscription.status);
    res.status(200).json({ status: subscription.status });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
