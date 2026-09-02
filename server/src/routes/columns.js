const express = require('express');
const { updateColumn, deleteColumn } = require('../controllers/columnController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);
router.put('/:id', updateColumn);
router.delete('/:id', deleteColumn);

module.exports = router;
