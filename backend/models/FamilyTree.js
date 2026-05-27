const mongoose = require('mongoose');

const familyTreeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a tree name'],
    trim: true,
    maxlength: [100, 'Tree name cannot be more than 100 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember'
  }],
  settings: {
    isPublic: {
      type: Boolean,
      default: false
    },
    allowInvites: {
      type: Boolean,
      default: true
    },
    treeLayout: {
      type: String,
      enum: ['vertical', 'horizontal', 'radial'],
      default: 'vertical'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}); 

// REMOVE the pre-save middleware entirely - it's causing the issue
// Just use the default behavior

module.exports = mongoose.model('FamilyTree', familyTreeSchema);