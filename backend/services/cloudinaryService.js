const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
const api_key = process.env.CLOUDINARY_API_KEY;
const api_secret = process.env.CLOUDINARY_API_SECRET;

if (cloud_name && api_key && api_secret) {
  cloudinary.config({
    cloud_name,
    api_key,
    api_secret
  });
}

/**
 * Uploads image to Cloudinary if available, or encodes as high-clarity Data URI for serverless persistence.
 */
const uploadImage = async (file) => {
  try {
    if (!file) return null;

    // 1. If Cloudinary credentials are provided, attempt Cloudinary upload
    if (cloud_name && api_key && api_secret) {
      try {
        if (file.path && fs.existsSync(file.path)) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'ewaste_uploads',
            quality: 'auto:good'
          });
          try {
            fs.unlinkSync(file.path);
          } catch {}
          if (result && result.secure_url) {
            return result.secure_url;
          }
        }
      } catch (cloudErr) {
        console.warn('Cloudinary upload warning:', cloudErr.message);
      }
    }

    // 2. High-reliability Serverless Fallback:
    // Encode image into Base64 Data URI so it is permanently stored in MongoDB
    // and displays with 100% crystal clarity across all devices and admin dashboards.
    if (file.path && fs.existsSync(file.path)) {
      const buffer = fs.readFileSync(file.path);
      const mimeType = file.mimetype || 'image/jpeg';
      const base64Str = buffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64Str}`;

      try {
        fs.unlinkSync(file.path);
      } catch {}

      return dataUri;
    }

    // 3. In-memory buffer fallback if available
    if (file.buffer) {
      const mimeType = file.mimetype || 'image/jpeg';
      return `data:${mimeType};base64,${file.buffer.toString('base64')}`;
    }

    return file.filename || null;
  } catch (error) {
    console.error('Image Upload Error:', error.message);
    return null;
  }
};

module.exports = { uploadImage };
