const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const { authenticateToken } = require('../middleware/auth'); // Assuming you have an auth middleware

// Initialize Razorpay with credentials from environment variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order
router.post('/create-order', authenticateToken, async (req, res) => {
  const { amount, itemId, currency } = req.body;

  if (!amount || !itemId || !currency) {
    return res.status(400).json({ error: 'Amount, itemId, and currency are required' });
  }

  try {
    const order = await razorpay.orders.create({
      amount: amount, // Amount in paise
      currency: currency,
      receipt: receipt_${itemId},
    });
    res.status(200).json({ orderId: order.id });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Verify payment
router.post('/verify', authenticateToken, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment details' });
  }

  const crypto = require('crypto');
  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(${razorpay_order_id}|${razorpay_payment_id})
    .digest('hex');

  if (generated_signature === razorpay_signature) {
    // Save payment details to database if needed
    res.status(200).json({ success: true, message: 'Payment verified successfully' });
  } else {
    res.status(400).json({ error: 'Invalid payment signature' });
  }
});

// Create Razorpay subscription
router.post('/create-subscription', authenticateToken, async (req, res) => {
  const { name, email, contact } = req.body;

  if (!name || !email || !contact) {
    return res.status(400).json({ error: 'Name, email, and contact are required' });
  }

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PLAN_ID, // Set this in .env
      customer_notify: 1,
      total_count: 365, // Number of billing cycles (e.g., 1 year for daily)
      quantity: 1,
      notes: {
        name,
        email,
        contact,
      },
    });
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
router.get('/history/:subscriptionId', authenticateToken, async (req, res) => {
  const { subscriptionId } = req.params;

  try {
    const payments = await razorpay.subscriptions.allPayments(subscriptionId);
    res.status(200).json(payments.items);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

module.exports = router;

 
