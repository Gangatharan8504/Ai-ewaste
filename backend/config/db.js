const mongoose = require('mongoose');

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

let adminSeeded = false;

const seedAdminOnce = async () => {
  if (adminSeeded) return;
  try {
    const User = require('../models/User');
    const admin = await User.findOne({ email: 'admin@ewaste.com' }).lean();
    if (!admin) {
      const newAdmin = new User({
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@ewaste.com',
        password: 'AdminPassword123',
        phone: '9999999999',
        address: 'EcoCollect Central Office',
        pincode: '600001',
        role: 'ADMIN',
        enabled: true,
        emailVerified: true
      });
      await newAdmin.save();
      console.log('Seeded default Admin User: admin@ewaste.com');
    }
    adminSeeded = true;
  } catch (err) {
    console.error('Admin initialization note:', err.message);
  }
};

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    const uri = process.env.MONGODB_URI || 'mongodb+srv://carrier-pilot:admin123@cluster0.kkdvuh4.mongodb.net/ewaste_db';

    cached.promise = mongoose.connect(uri, opts).then(async (m) => {
      console.log('MongoDB Connected');
      seedAdminOnce().catch(() => {});
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error(`MongoDB Connection Error: ${error.message}`);
    throw error;
  }

  return cached.conn;
};

module.exports = connectDB;
