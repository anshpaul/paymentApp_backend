const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount: Number, // Amount in INR
  paymentId: String,
  orderId: String,
  signature: String,
  email: String,
  contact: String,
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload' }, // Link to Upload
  createdAt: { type: Date, default: Date.now }, // ✅ renamed for clarity and consistency
});

module.exports = mongoose.model('Payment', paymentSchema);
