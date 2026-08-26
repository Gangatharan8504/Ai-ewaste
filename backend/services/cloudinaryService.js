const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

const cloud_name = process.env.CLOUDINARY_CLOUD_NAME || 'dzzrhnolm';
const api_key = process.env.CLOUDINARY_API_KEY || '823317569871914';
const api_secret = process.env.CLOUDINARY_API_SECRET || 'wkiPt20harCNdOT_E6qc-uzyaJA';

cloudinary.config({
  cloud_name,
  api_key,
  api_secret
});

/**
 * Uploads image to Cloudinary CDN with high resolution quality, or encodes as Data URI fallback.
 */
const uploadImage = async (file) => {
  try {
    if (!file) return null;

    // 1. Primary: Upload directly to Cloudinary CDN
    if (file.path && fs.existsSync(file.path)) {
      try {
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
      } catch (cloudErr) {
        console.warn('Cloudinary upload warning:', cloudErr.message);
      }
    }

    // 2. High-reliability Serverless Fallback:
    // Encode image into Base64 Data URI so it is permanently stored in MongoDB
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

    // 3. In-memory buffer fallback
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
