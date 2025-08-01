const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const dotenv = require('dotenv');

// ✅ Load environment variables from .env
dotenv.config();

const app = express();
app.use(express.json()); // ✅ Parse JSON bodies

// ✅ Initialize Razorpay with credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Health check (Render needs something on "/")
app.get('/', (req, res) => {
  res.send('🚀 Payment API is running!');
});

// ✅ Create Razorpay order
app.post('/create-order', async (req, res) => {
  const { amount, itemId, currency } = req.body;

  if (!amount || !itemId || !currency) {
    return res.status(400).json({ error: 'Amount, itemId, and currency are required' });
  }

  try {
    const order = await razorpay.orders.create({
      amount: amount, // Amount in paise
      currency: currency,
      receipt: `receipt_${itemId}`, // ✅ Fixed template literal
    });
    res.status(200).json({ orderId: order.id });
  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// ✅ Verify payment
app.post('/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
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
      res.status(400).json({ error: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ✅ Create Razorpay subscription
app.post('/create-subscription', async (req, res) => {
  const { name, email, contact } = req.body;

  if (!name || !email || !contact) {
    return res.status(400).json({ error: 'Name, email, and contact are required' });
  }

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PLAN_ID, // Set this in .env
      customer_notify: 1,
      total_count: 365,
      quantity: 1,
      notes: { name, email, contact },
    });
    res.status(200).json({
      subscription_id: subscription.id,
      short_url: subscription.short_url,
    });
  } catch (error) {
    console.error('❌ Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// ✅ Fetch subscription payment history
app.get('/history/:subscriptionId', async (req, res) => {
  const { subscriptionId } = req.params;

  try {
    const payments = await razorpay.subscriptions.allPayments(subscriptionId);
    res.status(200).json(payments.items);
  } catch (error) {
    console.error('❌ Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// ✅ Start the server (Render will keep this running)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
