const Task = require('../models/Task');
const Column = require('../models/Column');
const Project = require('../models/Project');
const Notification = require('../models/Notification');

// @desc  Get tasks for a project
// @route GET /api/projects/:projectId/tasks
// @access Private
const getProjectTasks = async (req, res, next) => {
  try {
    const { priority, assignee, status, dueDate, search, labels } = req.query;
    const filter = { project: req.params.projectId, isArchived: false };

    if (priority) filter.priority = priority;
    if (assignee) filter.assignees = assignee;
    if (status) filter.status = status;
    if (dueDate) {
      const date = new Date(dueDate);
      filter.dueDate = { $lte: date };
    }
    if (search) {
      filter.$text = { $search: search };
    }
    if (labels) {
      filter['labels.text'] = { $in: labels.split(',') };
    }

    const tasks = await Task.find(filter)
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('column', 'name')
      .sort({ column: 1, order: 1 });

    res.json({ success: true, data: { tasks } });
  } catch (error) {
    next(error);
  }
};

// @desc  Create task
// @route POST /api/projects/:projectId/tasks
// @access Private
const createTask = async (req, res, next) => {
  try {
    const { title, description, columnId, priority, assignees, dueDate, labels } = req.body;

    const column = await Column.findOne({
      _id: columnId,
      project: req.params.projectId,
    });
    if (!column) {
      return res.status(404).json({ success: false, message: 'Column not found' });
    }

    // Get max order in column
    const lastTask = await Task.findOne({ column: columnId }).sort({ order: -1 });
    const order = lastTask ? lastTask.order + 1 : 0;

    // Determine status from column name
    const statusMap = {
      'To Do': 'todo',
      'In Progress': 'in_progress',
      'Review': 'review',
      'Completed': 'completed',
    };
    const status = statusMap[column.name] || 'todo';

    const task = await Task.create({
      title,
      description: description || '',
      project: req.params.projectId,
      column: columnId,
      order,
      priority: priority || 'medium',
      status,
      assignees: assignees || [],
      createdBy: req.user._id,
      dueDate: dueDate || null,
      labels: labels || [],
    });

    await task.populate('assignees', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');
    await task.populate('column', 'name');

    // Send notifications to assignees
    if (assignees && assignees.length > 0) {
      for (const assigneeId of assignees) {
        if (assigneeId.toString() !== req.user._id.toString()) {
          const notif = await Notification.create({
            recipient: assigneeId,
            sender: req.user._id,
            type: 'task_assigned',
            message: `You were assigned to task "${task.title}"`,
            project: req.params.projectId,
            task: task._id,
          });
          await notif.populate('sender', 'name email avatar');
          if (req.io) {
            req.io.to(`user_${assigneeId}`).emit('notification', notif);
            req.io.to(`project_${req.params.projectId}`).emit('taskAssigned', {
              task,
              assigneeId,
            });
          }
        }
      }
    }

    // Emit real-time event to project room
    if (req.io) {
      req.io.to(`project_${req.params.projectId}`).emit('taskCreated', { task });
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Get single task
// @route GET /api/tasks/:id
// @access Private
const getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('column', 'name color')
      .populate('project', 'name members owner');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({ success: true, data: { task } });
  } catch (error) {
    next(error);
  }
};

// @desc  Update task
// @route PUT /api/tasks/:id
// @access Private
const updateTask = async (req, res, next) => {
  try {
    const { title, description, priority, assignees, dueDate, labels, status } = req.body;

    const task = await Task.findById(req.params.id).populate('project');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Check membership
    const project = task.project;
    const isMember =
      project.owner.toString() === req.user._id.toString() ||
      project.members.some((m) => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updateFields = {};
    if (title) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (priority) updateFields.priority = priority;
    if (assignees !== undefined) updateFields.assignees = assignees;
    if (dueDate !== undefined) updateFields.dueDate = dueDate;
    if (labels !== undefined) updateFields.labels = labels;
    if (status) {
      updateFields.status = status;
      if (status === 'completed') updateFields.completedAt = new Date();
      else updateFields.completedAt = null;
    }

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    })
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('column', 'name');

    // Notify assignees if new ones added
    if (assignees && assignees.length > 0) {
      const prevAssignees = (task.assignees || []).map((a) => a.toString());
      const newAssignees = assignees.filter((a) => !prevAssignees.includes(a.toString()));
      for (const assigneeId of newAssignees) {
        if (assigneeId.toString() !== req.user._id.toString()) {
          const notif = await Notification.create({
            recipient: assigneeId,
            sender: req.user._id,
            type: 'task_assigned',
            message: `You were assigned to task "${updatedTask.title}"`,
            project: task.project._id,
            task: task._id,
          });
          await notif.populate('sender', 'name email avatar');
          if (req.io) {
            req.io.to(`user_${assigneeId}`).emit('notification', notif);
            req.io.to(`project_${task.project._id}`).emit('taskAssigned', {
              task: updatedTask,
              assigneeId,
            });
          }
        }
      }
    }

    // Notify task creator of update
    if (task.createdBy && task.createdBy.toString() !== req.user._id.toString()) {
      const notif = await Notification.create({
        recipient: task.createdBy,
        sender: req.user._id,
        type: 'task_updated',
        message: `Task "${updatedTask.title}" was updated`,
        project: task.project._id,
        task: task._id,
      });
      await notif.populate('sender', 'name email avatar');
      if (req.io) {
        req.io.to(`user_${task.createdBy}`).emit('notification', notif);
      }
    }

    if (req.io) {
      req.io.to(`project_${task.project._id}`).emit('taskUpdated', { task: updatedTask });
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task: updatedTask },
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Move task (change column)
// @route PUT /api/tasks/:id/move
// @access Private
const moveTask = async (req, res, next) => {
  try {
    const { columnId, order } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const column = await Column.findById(columnId);
    if (!column) {
      return res.status(404).json({ success: false, message: 'Column not found' });
    }

    // Determine status from new column
    const statusMap = {
      'To Do': 'todo',
      'In Progress': 'in_progress',
      'Review': 'review',
      'Completed': 'completed',
    };

    const updateFields = {
      column: columnId,
      order: order !== undefined ? order : 0,
    };

    if (statusMap[column.name]) {
      updateFields.status = statusMap[column.name];
      if (column.name === 'Completed') updateFields.completedAt = new Date();
      else updateFields.completedAt = null;
    }

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, updateFields, { new: true })
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('column', 'name');

    if (req.io) {
      req.io.to(`project_${task.project}`).emit('taskMoved', {
        task: updatedTask,
        fromColumn: task.column,
        toColumn: columnId,
      });
    }

    res.json({
      success: true,
      message: 'Task moved successfully',
      data: { task: updatedTask },
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Delete task
// @route DELETE /api/tasks/:id
// @access Private
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const projectId = task.project;
    await task.deleteOne();

    if (req.io) {
      req.io.to(`project_${projectId}`).emit('taskDeleted', { taskId: req.params.id, columnId: task.column });
    }

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc  Get dashboard stats for user
// @route GET /api/tasks/dashboard
// @access Private
const getDashboardStats = async (req, res, next) => {
  try {
    const Project = require('../models/Project');
    const projects = await Project.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
      isArchived: false,
    });

    const projectIds = projects.map((p) => p._id);
    const now = new Date();

    const allTasks = await Task.find({ project: { $in: projectIds }, isArchived: false })
      .populate('assignees', 'name email avatar')
      .populate('column', 'name')
      .populate('project', 'name color')
      .sort({ updatedAt: -1 });

    const stats = {
      totalProjects: projects.length,
      activeTasks: allTasks.filter((t) => t.status !== 'completed').length,
      completedTasks: allTasks.filter((t) => t.status === 'completed').length,
      overdueTasks: allTasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed'
      ).length,
      recentTasks: allTasks.slice(0, 5),
      projects,
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjectTasks,
  createTask,
  getTask,
  updateTask,
  moveTask,
  deleteTask,
  getDashboardStats,
};
