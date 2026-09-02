const express = require('express');
const { getTask, updateTask, moveTask, deleteTask, getDashboardStats } = require('../controllers/taskController');
const { getComments, addComment } = require('../controllers/commentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/:id', getTask);
router.put('/:id', updateTask);
router.put('/:id/move', moveTask);
router.delete('/:id', deleteTask);

// Comments nested under task
router.get('/:taskId/comments', getComments);
router.post('/:taskId/comments', addComment);

module.exports = router;
