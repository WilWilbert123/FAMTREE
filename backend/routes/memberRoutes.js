// routes/memberRoutes.js
const express = require('express');
const {
  addMember,
  getMembers,
  updateMember,
  deleteMember,
  calculateRelationship
} = require('../controller/memberController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to each route individually
router.post('/add', authMiddleware, addMember);
router.get('/:treeId', authMiddleware, getMembers);
router.put('/:id', authMiddleware, updateMember);
router.delete('/:id', authMiddleware, deleteMember);
router.get('/:id/relationship/:otherId', authMiddleware, calculateRelationship);

module.exports = router;