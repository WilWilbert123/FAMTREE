// controller/treeController.js
const FamilyTree = require('../models/FamilyTree');
const FamilyMember = require('../models/FamilyMember');
const User = require('../models/User');

exports.createTree = async (req, res) => {
  console.log('=== CREATE TREE CALLED ===');
  console.log('Request body:', req.body);
  console.log('User ID:', req.user?.id);
  
  try {
    const { name, settings } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Tree name is required'
      });
    }
    
    // Create tree
    const tree = await FamilyTree.create({
      name,
      createdBy: req.user.id,
      settings: settings || {}
    });
    
    console.log('Tree created:', tree._id);

    // Add tree to user's familyTrees array
    await User.findByIdAndUpdate(req.user.id, {
      $push: { familyTrees: tree._id }
    });

    res.status(201).json({
      success: true,
      tree: tree
    });
  } catch (error) {
    console.error('Create tree error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getTree = async (req, res) => {
  console.log('=== GET TREE CALLED ===');
  console.log('Family ID:', req.params.familyId);
  
  try {
    const { familyId } = req.params;
    
    const tree = await FamilyTree.findById(familyId);
    
    if (!tree) {
      return res.status(404).json({
        success: false,
        message: 'Tree not found'
      });
    }

    res.status(200).json({
      success: true,
      tree: tree
    });
  } catch (error) {
    console.error('Get tree error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateTree = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const tree = await FamilyTree.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });
    
    if (!tree) {
      return res.status(404).json({
        success: false,
        message: 'Tree not found'
      });
    }
    
    res.status(200).json({
      success: true,
      tree: tree
    });
  } catch (error) {
    console.error('Update tree error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteTree = async (req, res) => {
  try {
    const { id } = req.params;
    
    const tree = await FamilyTree.findByIdAndDelete(id);
    
    if (!tree) {
      return res.status(404).json({
        success: false,
        message: 'Tree not found'
      });
    }
    
    // Delete all members associated with this tree
    await FamilyMember.deleteMany({ treeId: id });
    
    res.status(200).json({
      success: true,
      message: 'Tree deleted successfully'
    });
  } catch (error) {
    console.error('Delete tree error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};