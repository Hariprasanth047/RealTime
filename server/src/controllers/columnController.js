const Column = require('../models/Column');
const Task = require('../models/Task');

// @desc  Get columns for a project
// @route GET /api/projects/:projectId/columns
// @access Private
const getColumns = async (req, res, next) => {
  try {
    const columns = await Column.find({ project: req.params.projectId }).sort({ order: 1 });
    res.json({ success: true, data: { columns } });
  } catch (error) {
    next(error);
  }
};

// @desc  Create column
// @route POST /api/projects/:projectId/columns
// @access Private
const createColumn = async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const lastColumn = await Column.findOne({ project: req.params.projectId }).sort({ order: -1 });
    const order = lastColumn ? lastColumn.order + 1 : 0;

    const column = await Column.create({
      name,
      project: req.params.projectId,
      order,
      color: color || '#e2e8f0',
    });

    req.io.to(`project_${req.params.projectId}`).emit('columnCreated', { column });

    res.status(201).json({
      success: true,
      message: 'Column created',
      data: { column },
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Update column
// @route PUT /api/columns/:id
// @access Private
const updateColumn = async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const column = await Column.findByIdAndUpdate(
      req.params.id,
      { ...(name && { name }), ...(color && { color }) },
      { new: true }
    );

    if (!column) {
      return res.status(404).json({ success: false, message: 'Column not found' });
    }

    req.io.to(`project_${column.project}`).emit('columnUpdated', { column });

    res.json({ success: true, message: 'Column updated', data: { column } });
  } catch (error) {
    next(error);
  }
};

// @desc  Delete column
// @route DELETE /api/columns/:id
// @access Private
const deleteColumn = async (req, res, next) => {
  try {
    const column = await Column.findById(req.params.id);
    if (!column) {
      return res.status(404).json({ success: false, message: 'Column not found' });
    }

    // Delete all tasks in column
    await Task.deleteMany({ column: column._id });
    await column.deleteOne();

    req.io.to(`project_${column.project}`).emit('columnDeleted', { columnId: req.params.id });

    res.json({ success: true, message: 'Column deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc  Reorder columns
// @route PUT /api/projects/:projectId/columns/reorder
// @access Private
const reorderColumns = async (req, res, next) => {
  try {
    const { columns } = req.body; // [{ id, order }]
    for (const col of columns) {
      await Column.findByIdAndUpdate(col.id, { order: col.order });
    }

    req.io.to(`project_${req.params.projectId}`).emit('columnsReordered', { columns });

    res.json({ success: true, message: 'Columns reordered' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getColumns, createColumn, updateColumn, deleteColumn, reorderColumns };
