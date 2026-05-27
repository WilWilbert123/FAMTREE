const mongoose = require('mongoose');

const familyMemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  maidenName: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  birthDate: {
    type: Date
  },
  deathDate: {
    type: Date
  },
  bio: {
    type: String,
    maxlength: [1000, 'Bio cannot be more than 1000 characters']
  },
  avatar: {
    type: String,
    default: null
  },
  parents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember'
  }],
  spouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember'
  },
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember'
  }],
  treeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyTree',
    required: true
  }
}, {
  timestamps: true  // This automatically handles createdAt and updatedAt
});

// Remove the problematic pre-save middleware completely
// No need for custom pre-save or pre-update hooks since timestamps: true handles it

module.exports = mongoose.model('FamilyMember', familyMemberSchema);