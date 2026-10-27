const mongoose = require('mongoose');

const batchRowSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Batch ID is required'],
      index: true,
    },
    rowIndex: {
      type: Number,
      required: [true, 'Row index is required'],
    },
    inputs: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    results: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    llmResult: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'success', 'failed'],
        message: '{VALUE} is not a valid row processing status',
      },
      default: 'pending',
      index: true,
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast ordered queries and deduplication per batch
batchRowSchema.index({ batchId: 1, rowIndex: 1 }, { unique: true });

const BatchRow = mongoose.model('BatchRow', batchRowSchema);
module.exports = BatchRow;
