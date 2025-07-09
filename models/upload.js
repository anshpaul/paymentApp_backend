const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  imageUrl: String,
  title: String,
  description: String,
  totalDonated: { type: Number, default: 0 }, // Total amount donated in INR
  donorCount: { type: Number, default: 0 }, // Number of unique donors
});

module.exports = mongoose.model('Upload', uploadSchema);