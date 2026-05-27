const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const Media = require('../models/Media');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Compress image with sharp
    const compressedBuffer = await sharp(req.file.buffer)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'famtree',
          resource_type: 'auto'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(compressedBuffer);
    });

    // Create thumbnail
    const thumbnailBuffer = await sharp(req.file.buffer)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 60 })
      .toBuffer();

    const thumbnailResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'famtree/thumbnails',
          resource_type: 'auto'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(thumbnailBuffer);
    });

    // Save to database
    const media = await Media.create({
      url: result.secure_url,
      thumbnail: thumbnailResult.secure_url,
      type: 'photo',
      uploadedBy: req.user.id,
      memberId: req.body.memberId || null,
      album: req.body.album || 'General',
      tags: req.body.tags ? JSON.parse(req.body.tags) : []
    });

    res.status(200).json({
      success: true,
      media: {
        id: media._id,
        url: media.url,
        thumbnail: media.thumbnail
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.uploadMultiple = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadPromises = req.files.map(async (file) => {
      const compressedBuffer = await sharp(file.buffer)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'famtree' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(compressedBuffer);
      });

      return Media.create({
        url: result.secure_url,
        type: 'photo',
        uploadedBy: req.user.id,
        memberId: req.body.memberId || null,
        album: req.body.album || 'General'
      });
    });

    const mediaFiles = await Promise.all(uploadPromises);

    res.status(200).json({
      success: true,
      media: mediaFiles.map(m => ({
        id: m._id,
        url: m.url
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};