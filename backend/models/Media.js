const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String
  },
  type: {
    type: String,
    enum: ['photo', 'video', 'document'],
    default: 'photo'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember'
  },
  album: {
    type: String,
    default: 'General'
  },
  tags: [String],
  exif: {
    captureDate: Date,
    location: {
      lat: Number,
      lng: Number,
      name: String
    },
    camera: String
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Media', mediaSchema);