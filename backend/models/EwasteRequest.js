const mongoose = require('mongoose');

const EwasteRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceType: { type: String },
  brand: { type: String },
  model: { type: String },
  condition: { type: String },
  quantity: { type: Number, default: 1 },
  pickupAddress: { type: String },
  pickupLat: { type: Number },
  pickupLng: { type: Number },
  remarks: { type: String },
  imageUrls: [{ type: String }],
  status: { 
    type: String, 
    enum: ['PENDING_OTP', 'PENDING', 'ACCEPTED', 'REJECTED', 'SCHEDULED', 'COLLECTED', 'RECYCLING_IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BETTER_IMAGES_REQUIRED'], 
    default: 'PENDING' 
  },
  scheduledDate: { type: String },
  scheduledTime: { type: String },
  adminNotes: { type: String },
  collectionOtp: { type: String },
  submissionOtp: { type: String },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

EwasteRequestSchema.index({ user: 1, createdAt: -1 });
EwasteRequestSchema.index({ status: 1, createdAt: -1 });
EwasteRequestSchema.index({ createdAt: -1 });

EwasteRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('EwasteRequest', EwasteRequestSchema);
