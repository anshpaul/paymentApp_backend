const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/payment.model');
const Upload = require('../models/upload');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST - Create Razorpay order
router.post('/create-order', async (req, res) => {
  const { amount, itemId } = req.body;
  if (!amount || !itemId) {
    return res.status(400).json({ error: 'Amount and itemId are required' });
  }

  try {
    const upload = await Upload.findById(itemId);
    if (!upload) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const options = {
  amount, // already in paise
  currency: 'INR',
  receipt: `rcpt_${Date.now()}`, // ✅ shortened to valid format
};


    const order = await razorpay.orders.create(options);
    res.status(200).json({ orderId: order.id, amount, currency: 'INR' });
  } catch (err) {
    console.log("✅ Razorpay ID:", process.env.RAZORPAY_KEY_ID);
    console.log("✅ Razorpay Secret:", process.env.RAZORPAY_KEY_SECRET);
    console.error('Razorpay order creation failed:', err);
    res.status(500).json({
      error: `Failed to create order: ${err?.error?.description || err.message || 'Unknown error'}`,
    });
  }
});

// POST - Verify and save payment
router.post('/verify', async (req, res) => {
  const { paymentId, orderId, signature, amount, itemId, email, contact } = req.body;

  try {
    // Verify payment signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const upload = await Upload.findById(itemId);
    if (!upload) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const amountInINR = amount / 100; // ✅ convert paise to INR

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

    res.status(200).json({ message: 'Payment verified and saved', payment });
  } catch (err) {
    res.status(500).json({ error: `Payment verification failed: ${err.message}` });
  }
});

// GET - All payments
router.get('/history', async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('itemId', 'title')
      .sort({ createdAt: -1 });
    res.status(200).json(payments);
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch payments: ${err.message}` });
  }
});

module.exports = router;
