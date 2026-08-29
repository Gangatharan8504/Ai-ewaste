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

/**
 * PUT /:id/cancel
 * Cancels a pickup request by the user.
 */
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const request = await EwasteRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Pickup request not found' });
    }

    if (request.user.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to cancel this request' });
    }

    if (['COLLECTED', 'COMPLETED'].includes(request.status)) {
      return res.status(400).json({ message: 'Cannot cancel a request that has already been collected or completed.' });
    }

    request.status = 'CANCELLED';
    request.adminNotes = req.body.reason || 'Cancelled by customer';
    await request.save();

    // Create Notification
    const n = new Notification({
      user: request.user,
      title: 'Pickup Request Cancelled',
      message: `Your pickup request for ${request.brand || ''} ${request.deviceType || 'item'} has been successfully cancelled.`,
      requestId: request._id
    });
    await n.save();

    const obj = request.toObject();
    obj.id = obj._id.toString();

    return res.status(200).json({
      message: 'Pickup request cancelled successfully',
      request: obj
    });
  } catch (error) {
    console.error('Cancel Request Error:', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * DELETE /:id
 * Deletes a pickup request record.
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const request = await EwasteRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Pickup request not found' });
    }

    if (request.user.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to delete this record' });
    }

    await EwasteRequest.findByIdAndDelete(req.params.id);

    return res.status(200).json({ message: 'Pickup request record deleted successfully' });
  } catch (error) {
    console.error('Delete Request Error:', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * PUT /:id/confirm-slot
 * Confirms a proposed pickup slot.
 */
router.put('/:id/confirm-slot', protect, async (req, res) => {
  try {
    const request = await EwasteRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Pickup request not found' });
    }

    if (request.user.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    request.status = 'SCHEDULED';
    await request.save();

    const obj = request.toObject();
    obj.id = obj._id.toString();

    return res.status(200).json({
      message: 'Pickup slot confirmed successfully',
      request: obj
    });
  } catch (error) {
    console.error('Confirm Slot Error:', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * PUT /:id/request-reschedule
 * Submits a reschedule request for a pickup.
 */
router.put('/:id/request-reschedule', protect, async (req, res) => {
  try {
    const { requestedDate, requestedSlot } = req.query;
    const request = await EwasteRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Pickup request not found' });
    }

    if (request.user.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    request.status = 'RESCHEDULE_REQUESTED';
    request.adminNotes = `User requested reschedule: Date ${requestedDate || 'TBD'}, Slot: ${requestedSlot || 'TBD'}`;
    await request.save();

    const obj = request.toObject();
    obj.id = obj._id.toString();

    return res.status(200).json({
      message: 'Reschedule request submitted to admin',
      request: obj
    });
  } catch (error) {
    console.error('Request Reschedule Error:', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
