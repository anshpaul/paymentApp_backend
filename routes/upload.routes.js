const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Upload = require('../models/upload.js')

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// Setup multer with cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage: storage });

router.post('/', upload.single('image'), async (req, res) => {
  const { title, description } = req.body;
  try {
    const newUpload = new Upload({
      imageUrl: req.file.path,
      title,
      description,
    });
    await newUpload.save();
    res.status(201).json({ message: 'Uploaded successfully', data: newUpload });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});
// GET all uploaded data
router.get('/', async (req, res) => {
  try {
    const uploads = await Upload.find().sort({ _id: -1 }); // latest first
    res.status(200).json(uploads);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});
// PUT - update by ID
router.put('/:id', async (req, res) => {
  const { title, description } = req.body;
  try {
    const updated = await Upload.findByIdAndUpdate(
      req.params.id,
      { title, description },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE - delete by ID
router.delete('/:id', async (req, res) => {
  try {
    await Upload.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});


module.exports = router;
