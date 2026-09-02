const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    next(error);
  }
};

// Check if user is a project member
const requireProjectMember = async (req, res, next) => {
  const Project = require('../models/Project');
  const projectId = req.params.projectId || req.params.id;

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const isMember = project.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );
    const isOwner = project.owner.toString() === req.user._id.toString();

    if (!isMember && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: you are not a member of this project',
      });
    }

    req.project = project;
    next();
  } catch (error) {
    next(error);
  }
};

// Check if user is project owner or admin
const requireProjectAdmin = async (req, res, next) => {
  const Project = require('../models/Project');
  const projectId = req.params.projectId || req.params.id;

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const isOwner = project.owner.toString() === req.user._id.toString();
    const member = project.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );
    const isAdmin = member && (member.role === 'admin' || member.role === 'owner');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: admin or owner role required',
      });
    }

    req.project = project;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { protect, requireProjectMember, requireProjectAdmin };
