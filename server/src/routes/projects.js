const express = require('express');
const {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  updateMemberRole,
  removeMember,
  getProjectStats,
} = require('../controllers/projectController');
const { getProjectTasks, createTask } = require('../controllers/taskController');
const { getColumns, createColumn, reorderColumns } = require('../controllers/columnController');
const { protect, requireProjectMember, requireProjectAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getProjects);
router.post('/', createProject);
router.get('/:id', requireProjectMember, getProject);
router.put('/:id', requireProjectAdmin, updateProject);
router.delete('/:id', deleteProject);
router.get('/:id/stats', requireProjectMember, getProjectStats);

// Member management
router.post('/:projectId/members', requireProjectAdmin, addMember);
router.put('/:projectId/members/:userId/role', requireProjectAdmin, updateMemberRole);
router.delete('/:projectId/members/:userId', requireProjectAdmin, removeMember);

// Tasks nested under project
router.get('/:projectId/tasks', requireProjectMember, getProjectTasks);
router.post('/:projectId/tasks', requireProjectMember, createTask);

// Columns nested under project
router.get('/:projectId/columns', requireProjectMember, getColumns);
router.post('/:projectId/columns', requireProjectMember, createColumn);
router.put('/:projectId/columns/reorder', requireProjectMember, reorderColumns);

module.exports = router;
