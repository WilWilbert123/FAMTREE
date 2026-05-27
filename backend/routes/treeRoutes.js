// routes/treeRoutes.js
const express = require('express');
const {
  createTree,
  getTree,
  updateTree,
  deleteTree
} = require('../controller/treeController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

router.post('/create', createTree);
router.get('/:familyId', getTree);
router.put('/:id/update', updateTree);
router.delete('/:id', deleteTree);

module.exports = router;