const mongoose = require('mongoose');

const columnSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Column name is required'],
      trim: true,
      maxlength: [50, 'Column name cannot exceed 50 characters'],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      default: '#e2e8f0',
    },
    taskLimit: {
      type: Number,
      default: null, // null means no limit
    },
  },
  {
    timestamps: true,
  }
);

columnSchema.index({ project: 1, order: 1 });

module.exports = mongoose.model('Column', columnSchema);
