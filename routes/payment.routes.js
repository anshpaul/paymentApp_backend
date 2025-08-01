const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const Payment = require('../models/payment.model');
const Upload = require('../models/upload');

// ✅ Initialize Razorpay with credentials from environment variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ===============================
// 🚀 1️⃣ CREATE RAZORPAY ORDER
// ===============================
router.post('/create-order', authenticateToken, async (req, res) => {
  const { amount, itemId, currency } = req.body;

  if (!amount || !itemId || !currency) {
    return res.status(400).json({ error: 'Amount, itemId, and currency are required' });
  }

  try {
    // ✅ Find the item in DB
    const upload = await Upload.findById(itemId);
    if (!upload) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // ✅ Create Razorpay order
    const options = {
      amount, // in paise
      currency,
      receipt: `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      orderId: order.id,
      amount,
      currency,
    });
  } catch (err) {
    console.error('❌ Razorpay order creation failed:', err);
    res.status(500).json({
      error: `Failed to create order: ${err?.error?.description || err.message || 'Unknown error'}`,
    });
  }
});

// ===============================
// 🚀 2️⃣ VERIFY PAYMENT & SAVE
// ===============================
router.post('/verify', authenticateToken, async (req, res) => {
  const { paymentId, orderId, signature, amount, itemId, email, contact } = req.body;

  try {
    // ✅ Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // ✅ Find the item
    const upload = await Upload.findById(itemId);
    if (!upload) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const amountInINR = amount / 100; // Convert paise to INR

    // ✅ Save payment in DB
    const payment = new Payment({
      amount: amountInINR,
      paymentId,
      orderId,
      signature,
      email,
      contact,
      itemId,
    });

    await payment.save();

    // ✅ Update donation stats
    upload.totalDonated += amountInINR;
    upload.donorCount += 1;
    await upload.save();

    res.status(200).json({ message: '✅ Payment verified and saved', payment });
  } catch (err) {
    console.error('❌ Payment verification failed:', err);
    res.status(500).json({ error: `Payment verification failed: ${err.message}` });
  }
});

// ===============================
// 🚀 3️⃣ GET ALL PAYMENTS HISTORY
// ===============================
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('itemId', 'title')
      .sort({ createdAt: -1 });

    res.status(200).json(payments);
  } catch (err) {
    console.error('❌ Fetch payments error:', err);
    res.status(500).json({ error: `Failed to fetch payments: ${err.message}` });
  }
});

// ===============================
// 🚀 4️⃣ CREATE SUBSCRIPTION
// ===============================
router.post('/create-subscription', authenticateToken, async (req, res) => {
  const { name, email, contact } = req.body;

  if (!name || !email || !contact) {
    return res.status(400).json({ error: 'Name, email, and contact are required' });
  }

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PLAN_ID,
      customer_notify: 1,
      total_count: 365, // e.g. daily billing for a year
      quantity: 1,
      notes: { name, email, contact },
    });

    res.status(200).json({
      subscription_id: subscription.id,
      short_url: subscription.short_url,
    });
  } catch (err) {
    console.error('❌ Error creating subscription:', err);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// ===============================
// 🚀 5️⃣ SUBSCRIPTION PAYMENT HISTORY
// ===============================
router.get('/history/:subscriptionId', authenticateToken, async (req, res) => {
  const { subscriptionId } = req.params;

  try {
    const payments = await razorpay.subscriptions.allPayments(subscriptionId);
    res.status(200).json(payments.items);
  } catch (err) {
    console.error('❌ Error fetching subscription history:', err);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

module.exports = router;
