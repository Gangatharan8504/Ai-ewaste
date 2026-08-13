const express = require('express');
const router = express.Router();
const EwasteRequest = require('../models/EwasteRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, adminOnly } = require('../middleware/auth');
const { sendPickupScheduled, sendBetterImagesRequired, sendTrackingStatusUpdate } = require('../services/emailService');

/**
 * GET /requests
 * Lists all requests for admin review.
 */
router.get('/requests', protect, adminOnly, async (req, res) => {
  try {
    const requests = await EwasteRequest.find()
      .populate('user', 'firstName lastName email phone')
      .sort({ createdAt: -1 });

    const mapped = requests.map(r => {
      const obj = r.toObject();
      obj.id = obj._id.toString();
      if (obj.user) {
        obj.userName = `${obj.user.firstName} ${obj.user.lastName}`;
        obj.userEmail = obj.user.email;
        obj.userPhone = obj.user.phone;
      }
      return obj;
    });

    return res.status(200).json(mapped);
  } catch (error) {
    console.error('Admin Fetch Requests Error:', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * GET /requests/:id
 * Fetches details of a single request for the admin.
 */
router.get('/requests/:id', protect, adminOnly, async (req, res) => {
  try {
    const request = await EwasteRequest.findById(req.params.id)
      .populate('user', 'firstName lastName email phone');
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
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
    console.error('Admin Fetch Single Request Error:', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * PUT /requests/:id/status
 * Updates request status.
 */
router.put('/requests/:id/status', protect, adminOnly, async (req, res) => {
  const { status } = req.body;

  const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'COLLECTED', 'RECYCLING_IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BETTER_IMAGES_REQUIRED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid request status value' });
  }

  try {
    const request = await EwasteRequest.findById(req.params.id).populate('user', 'email firstName');
    if (!request) {
      return res.status(404).json({ message: 'Pickup request not found' });
    }

    if (status === 'ACCEPTED' && !request.collectionOtp) {
      request.collectionOtp = Math.floor(100000 + Math.random() * 900000).toString();
    }
    request.status = status;
    await request.save();

    // Notification title & details
    let title = 'Pickup Request Update';
    let message = `Your request status has been updated to ${status}.`;

    if (status === 'BETTER_IMAGES_REQUIRED') {
      title = 'Better Images Required';
      message = `Please upload better images of the device for request #${request._id}.`;
      await sendBetterImagesRequired(request.user.email, request.deviceType || 'Electronic Device');
    } else if (status === 'ACCEPTED') {
      title = 'Pickup Request Approved';
      message = `Your e-waste collection request #${request._id} has been approved by the admin. Collection OTP generated: ${request.collectionOtp}`;
      await sendTrackingStatusUpdate(request.user.email, request.deviceType || 'Electronic Device', request._id, 'APPROVED', '', request.collectionOtp);
    } else if (status === 'COMPLETED') {
      title = 'Recycling Completed';
      message = `The recycling process for your device under request #${request._id} is now complete. Thank you!`;
      await sendTrackingStatusUpdate(request.user.email, request.deviceType || 'Electronic Device', request._id, 'COMPLETED', '', request.collectionOtp);
    } else if (status === 'COLLECTED') {
      title = 'Item Collected';
      message = `Our agent has successfully collected your electronic device for request #${request._id}.`;
      await sendTrackingStatusUpdate(request.user.email, request.deviceType || 'Electronic Device', request._id, 'COLLECTED', '', request.collectionOtp);
    } else {
      await sendTrackingStatusUpdate(request.user.email, request.deviceType || 'Electronic Device', request._id, status, '', request.collectionOtp);
    }

    const notification = new Notification({
      user: request.user._id,
      title,
      message,
      requestId: request._id
    });
    await notification.save();

    return res.status(200).json(request);
  } catch (error) {
    console.error('Update Request Status Error:', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * PUT /requests/:id/schedule
 * Schedules request date/time.
 */
router.put('/requests/:id/schedule', protect, adminOnly, async (req, res) => {
  const { scheduledDate, scheduledTime, adminNotes } = req.body;

  if (!scheduledDate || !scheduledTime) {
    return res.status(400).json({ message: 'Date and time are required for scheduling' });
  }

  try {
    const request = await EwasteRequest.findById(req.params.id).populate('user', 'email firstName');
    if (!request) {
      return res.status(404).json({ message: 'Pickup request not found' });
    }

    if (!request.collectionOtp) {
      request.collectionOtp = Math.floor(100000 + Math.random() * 900000).toString();
    }
    request.status = 'SCHEDULED';
    request.scheduledDate = scheduledDate;
    request.scheduledTime = scheduledTime;
    request.adminNotes = adminNotes || '';
    await request.save();

    // Send scheduling confirmation email
    await sendPickupScheduled(
      request.user.email,
      request.deviceType || 'Electronic Device',
      scheduledDate,
      scheduledTime,
      adminNotes,
      request.collectionOtp
    );

    // Save user notifications
    const n1 = new Notification({
      user: request.user._id,
      title: 'Pickup Scheduled',
      message: `Your pickup request has been scheduled for ${scheduledDate} at ${scheduledTime}.`,
      requestId: request._id
    });
    await n1.save();

    const n2 = new Notification({
      user: request.user._id,
      title: 'Pickup Agent Assigned',
      message: `A pickup agent is assigned to collect your device on ${scheduledDate}.`,
      requestId: request._id
    });
    await n2.save();

    return res.status(200).json(request);
  } catch (error) {
    console.error('Scheduling Request Error:', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * GET /stats
 * Dashboard stats metrics.
 */
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'USER' });
    const totalRequests = await EwasteRequest.countDocuments();
    const completedRecyclings = await EwasteRequest.countDocuments({ status: 'COMPLETED' });
    const reportsGenerated = await EwasteRequest.countDocuments({ isElectronicDevice: { $ne: null } });

    // Aggregate environmental offset and value sums
    const aggregateData = await EwasteRequest.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$estimatedValue' },
          totalCarbonSaved: { $sum: { $cond: [{ $eq: ['$isElectronicDevice', true] }, 15, 0] } } // Estimate 15kg carbon per electronic device
        }
      }
    ]);

    const totalValue = aggregateData[0] ? aggregateData[0].totalValue : 0;
    const carbonSaved = aggregateData[0] ? aggregateData[0].totalCarbonSaved : 0;

    // Aggregate most recycled devices
    const deviceTallies = await EwasteRequest.aggregate([
      { $match: { isElectronicDevice: true } },
      { $group: { _id: '$deviceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const mostRecycled = deviceTallies.map(t => ({
      deviceType: t._id || 'Unknown',
      count: t.count
    }));

    return res.status(200).json({
      totalUsers,
      totalRequests,
      completedRecyclings,
      aiReportsGenerated: reportsGenerated,
      mostRecycledDevices: mostRecycled,
      estimatedRecyclingValue: totalValue,
      carbonOffsetKgs: carbonSaved || totalRequests * 10
    });
  } catch (error) {
    console.error('Stats Generation Error:', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
