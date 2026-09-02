const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// Search users by email (for adding to projects)
router.get('/search', async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email query required' });
    }

    const users = await User.find({
      email: { $regex: email, $options: 'i' },
      _id: { $ne: req.user._id },
    }).select('name email avatar').limit(5);

    res.json({ success: true, data: { users } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
