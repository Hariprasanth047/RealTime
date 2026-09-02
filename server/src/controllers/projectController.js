const Project = require('../models/Project');
const Board = require('../models/Board');
const Column = require('../models/Column');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc  Get all user projects
// @route GET /api/projects
// @access Private
const getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id },
      ],
      isArchived: false,
    })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      message: 'Projects retrieved successfully',
      data: { projects },
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Create project
// @route POST /api/projects
// @access Private
const createProject = async (req, res, next) => {
  try {
    const { name, description, color, icon } = req.body;

    const project = await Project.create({
      name,
      description: description || '',
      color: color || '#6366f1',
      icon: icon || '📋',
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'owner' }],
    });

    // Create default columns
    const defaultColumns = ['To Do', 'In Progress', 'Review', 'Completed'];
    const columnColors = ['#e2e8f0', '#fef3c7', '#dbeafe', '#dcfce7'];
    const createdColumnIds = [];

    for (let i = 0; i < defaultColumns.length; i++) {
      const col = await Column.create({
        name: defaultColumns[i],
        project: project._id,
        order: i,
        color: columnColors[i],
      });
      createdColumnIds.push(col._id);
    }

    // Create default board referencing the columns
    await Board.create({
      name: `${name} Board`,
      project: project._id,
      columns: createdColumnIds,
      isDefault: true,
    });

    await project.populate('owner', 'name email avatar');
    await project.populate('members.user', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Get single project
// @route GET /api/projects/:id
// @access Private
const getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({
      success: true,
      message: 'Project details retrieved',
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Update project
// @route PUT /api/projects/:id
// @access Private (owner/admin)
const updateProject = async (req, res, next) => {
  try {
    const { name, description, color, icon } = req.body;
    const updateFields = {};
    if (name) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (color) updateFields.color = color;
    if (icon) updateFields.icon = icon;

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    )
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Emit real-time update
    if (req.io) {
      req.io.to(`project_${project._id}`).emit('projectUpdated', { project });
    }

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Delete project
// @route DELETE /api/projects/:id
// @access Private (owner only)
const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Only owner can delete
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the project owner can delete it' });
    }

    // Delete all related data
    const columns = await Column.find({ project: project._id });
    for (const col of columns) {
      await Task.deleteMany({ column: col._id });
    }
    await Column.deleteMany({ project: project._id });
    await Board.deleteMany({ project: project._id });
    await Notification.deleteMany({ project: project._id });
    await project.deleteOne();

    if (req.io) {
      req.io.to(`project_${req.params.id}`).emit('projectDeleted', { projectId: req.params.id });
    }

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc  Add member to project
// @route POST /api/projects/:projectId/members
// @access Private (owner/admin)
const addMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with that email' });
    }

    const alreadyMember = project.members.some(
      (m) => m.user.toString() === user._id.toString()
    );
    if (alreadyMember || project.owner.toString() === user._id.toString()) {
      return res.status(400).json({ success: false, message: 'User is already a member' });
    }

    const validRole = ['admin', 'member'].includes(role) ? role : 'member';
    project.members.push({ user: user._id, role: validRole });
    await project.save();
    await project.populate('members.user', 'name email avatar');

    // Create notification
    await Notification.create({
      recipient: user._id,
      sender: req.user._id,
      type: 'added_to_project',
      message: `You were added to project "${project.name}" as ${validRole}`,
      project: project._id,
    });

    // Emit events
    if (req.io) {
      req.io.to(`project_${project._id}`).emit('memberAdded', {
        projectId: project._id,
        member: { user, role: validRole },
      });
    }

    res.json({
      success: true,
      message: 'Member added successfully',
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Update member role
// @route PUT /api/projects/:projectId/members/:userId/role
// @access Private (owner only)
const updateMemberRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be admin or member' });
    }

    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the project owner can change roles' });
    }

    const memberIndex = project.members.findIndex(
      (m) => m.user.toString() === req.params.userId
    );

    if (memberIndex === -1) {
      return res.status(404).json({ success: false, message: 'Member not found in project' });
    }

    project.members[memberIndex].role = role;
    await project.save();
    await project.populate('members.user', 'name email avatar');

    if (req.io) {
      req.io.to(`project_${project._id}`).emit('memberRoleUpdated', {
        projectId: project._id,
        userId: req.params.userId,
        role,
      });
    }

    res.json({
      success: true,
      message: 'Member role updated successfully',
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Remove member from project
// @route DELETE /api/projects/:projectId/members/:userId
// @access Private (owner/admin)
const removeMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.owner.toString() === req.params.userId) {
      return res.status(400).json({ success: false, message: 'Cannot remove the project owner' });
    }

    project.members = project.members.filter(
      (m) => m.user.toString() !== req.params.userId
    );
    await project.save();

    if (req.io) {
      req.io.to(`project_${project._id}`).emit('memberRemoved', {
        projectId: project._id,
        userId: req.params.userId,
      });
    }

    res.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc  Get project stats
// @route GET /api/projects/:id/stats
// @access Private
const getProjectStats = async (req, res, next) => {
  try {
    const tasks = await Task.find({ project: req.params.id, isArchived: false });
    const now = new Date();

    const stats = {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      review: tasks.filter((t) => t.status === 'review').length,
      overdue: tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed').length,
      byPriority: {
        urgent: tasks.filter((t) => t.priority === 'urgent').length,
        high: tasks.filter((t) => t.priority === 'high').length,
        medium: tasks.filter((t) => t.priority === 'medium').length,
        low: tasks.filter((t) => t.priority === 'low').length,
      },
    };

    res.json({
      success: true,
      message: 'Project stats retrieved',
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  updateMemberRole,
  removeMember,
  getProjectStats,
};
