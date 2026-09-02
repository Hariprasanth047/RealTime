const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Notification = require('../models/Notification');

// @desc  Get comments for a task
// @route GET /api/tasks/:taskId/comments
// @access Private
const getComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ task: req.params.taskId })
      .populate('author', 'name email avatar')
      .sort({ createdAt: 1 });

    res.json({ success: true, data: { comments } });
  } catch (error) {
    next(error);
  }
};

// @desc  Add comment to a task
// @route POST /api/tasks/:taskId/comments
// @access Private
const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const task = await Task.findById(req.params.taskId).populate('createdBy assignees');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const comment = await Comment.create({
      text,
      task: req.params.taskId,
      project: task.project,
      author: req.user._id,
    });

    await comment.populate('author', 'name email avatar');

    // Notify task creator
    if (task.createdBy && task.createdBy._id.toString() !== req.user._id.toString()) {
      const notif = await Notification.create({
        recipient: task.createdBy._id,
        sender: req.user._id,
        type: 'comment_added',
        message: `${req.user.name} commented on "${task.title}"`,
        project: task.project,
        task: task._id,
      });
      await notif.populate('sender', 'name email avatar');
      if (req.io) {
        req.io.to(`user_${task.createdBy._id}`).emit('notification', notif);
      }
    }

    // Notify assignees
    for (const assignee of task.assignees || []) {
      const aid = assignee._id || assignee;
      if (aid.toString() !== req.user._id.toString() &&
          (!task.createdBy || aid.toString() !== task.createdBy._id.toString())) {
        const notif = await Notification.create({
          recipient: aid,
          sender: req.user._id,
          type: 'comment_added',
          message: `${req.user.name} commented on "${task.title}"`,
          project: task.project,
          task: task._id,
        });
        await notif.populate('sender', 'name email avatar');
        if (req.io) {
          req.io.to(`user_${aid}`).emit('notification', notif);
        }
      }
    }

    // Emit real-time event
    req.io.to(`project_${task.project}`).emit('commentAdded', {
      comment,
      taskId: req.params.taskId,
    });

    res.status(201).json({
      success: true,
      message: 'Comment added',
      data: { comment },
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Delete comment
// @route DELETE /api/comments/:id
// @access Private
const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    await comment.deleteOne();

    req.io.to(`project_${comment.project}`).emit('commentDeleted', {
      commentId: req.params.id,
      taskId: comment.task,
    });

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getComments, addComment, deleteComment };
