// controller/memberController.js
const FamilyMember = require('../models/FamilyMember');
const FamilyTree = require('../models/FamilyTree');

exports.addMember = async (req, res, next) => {
  try {
    console.log('=== addMember called ===');
    console.log('Request body:', req.body);
    
    const memberData = {
      ...req.body,
      treeId: req.body.treeId
    };
    
    const member = await FamilyMember.create(memberData);
    console.log('Member created:', member._id);
    
    // Add member to tree's members array
    await FamilyTree.findByIdAndUpdate(req.body.treeId, {
      $addToSet: { members: member._id }
    });

    // Keep parent/child relationships consistent
    if (Array.isArray(req.body.parents) && req.body.parents.length > 0) {
      await FamilyMember.updateMany(
        { _id: { $in: req.body.parents } },
        { $addToSet: { children: member._id } }
      );
    }

    // Keep spouse relationship consistent on both sides
    if (req.body.spouse) {
      await FamilyMember.findByIdAndUpdate(req.body.spouse, {
        spouse: member._id
      });
    }
    
    res.status(201).json({
      success: true,
      member: member
    });
  } catch (error) {
    console.error('Error in addMember:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMembers = async (req, res, next) => {
  try {
    const { treeId } = req.params;
    console.log('Getting members for treeId:', treeId);
    
    const members = await FamilyMember.find({ treeId: treeId });
    console.log(`Found ${members.length} members`);
    
    res.status(200).json({
      success: true,
      members: members
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    console.log('Updating member:', id, updates);
    
    const member = await FamilyMember.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    res.status(200).json({
      success: true,
      member: member
    });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const member = await FamilyMember.findByIdAndDelete(id);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Remove member from tree's members array
    await FamilyTree.findByIdAndUpdate(member.treeId, {
      $pull: { members: id }
    });

    // Remove member from parent children arrays
    if (Array.isArray(member.parents) && member.parents.length > 0) {
      await FamilyMember.updateMany(
        { _id: { $in: member.parents } },
        { $pull: { children: id } }
      );
    }

    // Remove member from spouse reference
    if (member.spouse) {
      await FamilyMember.findByIdAndUpdate(member.spouse, {
        $unset: { spouse: '' }
      });
    }

    // Remove member from any children parent arrays
    if (Array.isArray(member.children) && member.children.length > 0) {
      await FamilyMember.updateMany(
        { _id: { $in: member.children } },
        { $pull: { parents: id } }
      );
    }
    
    res.status(200).json({
      success: true,
      message: 'Member deleted successfully'
    });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.calculateRelationship = async (req, res, next) => {
  try {
    const { id, otherId } = req.params;
    
    const member1 = await FamilyMember.findById(id);
    const member2 = await FamilyMember.findById(otherId);
    
    if (!member1 || !member2) {
      return res.status(404).json({
        success: false,
        message: 'Member(s) not found'
      });
    }
    
    let relationship = 'Connected';
    
    if (member1.spouse && member1.spouse.toString() === otherId) {
      relationship = 'Spouse';
    } else if (member1.parents.includes(otherId)) {
      relationship = 'Child';
    } else if (member2.parents.includes(id)) {
      relationship = 'Parent';
    } else {
      relationship = 'Relative';
    }
    
    res.status(200).json({
      success: true,
      relationship
    });
  } catch (error) {
    console.error('Calculate relationship error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};