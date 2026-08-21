const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const EwasteRequest = require('../models/EwasteRequest');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { sendPickupSubmitted, sendPickupVerificationOtp } = require('../services/emailService');
const { uploadImage } = require('../services/cloudinaryService');

// Multer Storage Setup
const uploadsFolder = process.env.VERCEL ? '/tmp' : path.join(__dirname, '../uploads');
if (!process.env.VERCEL && !fs.existsSync(uploadsFolder)) {
  fs.mkdirSync(uploadsFolder, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsFolder);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.floor(Math.random() * 10000)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * POST /
 * Submits a new pickup request and sends verification OTP.
 */
router.post('/', protect, upload.array('images', 5), async (req, res) => {
  const {
    deviceType, brand, model, condition, quantity, pickupAddress,
    pickupLat, pickupLng, remarks
  } = req.body;

  try {
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadImage(file);
        if (url) imageUrls.push(url);
      }
    }

    const qty = parseInt(quantity) || 1;
    const submissionOtp = Math.floor(100000 + Math.random() * 900000).toString();

    const pickupRequest = new EwasteRequest({
      user: req.user._id,
      deviceType,
      brand,
      model,
      condition,
      quantity: qty,
      pickupAddress,
      pickupLat: pickupLat ? parseFloat(pickupLat) : undefined,
      pickupLng: pickupLng ? parseFloat(pickupLng) : undefined,
      remarks,
      imageUrls,
      status: 'PENDING_OTP',
      submissionOtp
    });

    await pickupRequest.save();

    // Send OTP verification email
    await sendPickupVerificationOtp(
      req.user.email,
      deviceType,
      qty,
      pickupAddress,
      submissionOtp,
      req.user.firstName
    );

    const obj = pickupRequest.toObject();
    obj.id = obj._id.toString();

    return res.status(201).json({
      message: 'Pickup request created! Verification OTP sent to your email.',
      requestId: obj.id,
      status: 'PENDING_OTP',
      requiresOtp: true,
      request: obj
    });
  } catch (error) {
    console.error('Submit Request Error:', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * POST /:id/verify-submission-otp
 * Verifies the user submission OTP to activate the pickup request.
 */
router.post('/:id/verify-submission-otp', protect, async (req, res) => {
  const { otp } = req.body;
  if (!otp) {
    return res.status(400).json({ message: 'OTP is required' });
  }

  try {
    const request = await EwasteRequest.findOne({ _id: req.params.id, user: req.user._id });
    if (!request) {
      return res.status(404).json({ message: 'Pickup request not found' });
    }

    if (request.status !== 'PENDING_OTP') {
      return res.status(400).json({ message: 'This pickup request is already verified.' });
    }

    if (request.submissionOtp !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid OTP code. Please check your email and try again.' });
    }

    request.status = 'PENDING';
    request.submissionOtp = undefined;
    await request.save();

    // Generate Notification
    const n = new Notification({
      user: req.user._id,
      title: 'Pickup Request Verified & Submitted',
      message: `Your pickup request for ${request.brand || ''} ${request.deviceType || 'item'} has been verified and is under review by our admin.`,
      requestId: request._id
    });
    await n.save();

    // Send confirmation email
    await sendPickupSubmitted(
      req.user.email,
      request.deviceType,
      request.quantity,
      request.pickupAddress,
      req.user.firstName
    );

    const obj = request.toObject();
    obj.id = obj._id.toString();

    return res.status(200).json({
      message: 'Pickup request verified and submitted successfully!',
      request: obj
    });
  } catch (error) {
    console.error('Verify Submission OTP Error:', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * POST /:id/resend-submission-otp
 * Resends the submission OTP to the user's email.
 */
router.post('/:id/resend-submission-otp', protect, async (req, res) => {
  try {
    const request = await EwasteRequest.findOne({ _id: req.params.id, user: req.user._id });
    if (!request) {
      return res.status(404).json({ message: 'Pickup request not found' });
    }

    if (request.status !== 'PENDING_OTP') {
      return res.status(400).json({ message: 'This request is already verified.' });
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    request.submissionOtp = newOtp;
    await request.save();

    await sendPickupVerificationOtp(
      req.user.email,
      request.deviceType,
      request.quantity,
      request.pickupAddress,
      newOtp,
      req.user.firstName
    );

    return res.status(200).json({ message: 'New verification OTP sent to your email.' });
  } catch (error) {
    console.error('Resend Submission OTP Error:', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * GET /my
 * Lists all requests for logged in user.
 */
router.get('/my', protect, async (req, res) => {
  try {
    const requests = await EwasteRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
    const mapped = requests.map(r => {
      const obj = r.toObject();
      obj.id = obj._id.toString();
      return obj;
    });
    return res.status(200).json(mapped);
  } catch (error) {
    console.error('Fetch User Requests Error:', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * GET /:id
 * Fetch request by ID.
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const request = await EwasteRequest.findById(req.params.id).populate('user', 'firstName lastName email phone');
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Verify ownership or admin role
    if (request.user._id.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const obj = request.toObject();
    obj.id = obj._id.toString();
    if (obj.user) {
      obj.userName = `${obj.user.firstName} ${obj.user.lastName}`;
      obj.userEmail = obj.user.email;
      obj.userPhone = obj.user.phone;
    }

    return res.status(200).json(obj);
  } catch (error) {
    console.error('Fetch Single Request Error:', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
