const cloudinary = require('cloudinary').v2;

// Initialize Cloudinary if credentials are present
const isConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    });
}

/**
 * Generate a signed upload signature for direct browser-to-Cloudinary upload.
 * This completely avoids streaming large files through the Render instance.
 */
function generateUploadSignature(options = {}) {
    if (!isConfigured) {
        return null;
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = options.folder || 'tailorlearn/materials';
    
    // Parameters to sign
    const paramsToSign = {
        timestamp,
        folder
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

    return {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        timestamp,
        folder,
        signature
    };
}

/**
 * Get client storage config (supports both signed and unsigned uploads)
 */
function getClientStorageConfig() {
    return {
        isConfigured,
        provider: 'cloudinary',
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
        uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || ''
    };
}

module.exports = {
    cloudinary,
    isConfigured,
    generateUploadSignature,
    getClientStorageConfig
};

