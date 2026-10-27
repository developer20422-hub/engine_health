const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true,
    },
    organisationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisation',
      default: null,
      index: true,
    },
    fileName: {
      type: String,
      required: [true, 'Batch file name is required'],
      trim: true,
    },
    rowCount: {
      type: Number,
      default: 0,
      min: [0, 'Row count cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['queued', 'processing', 'done', 'failed'],
        message: '{VALUE} is not a valid batch status',
      },
      default: 'queued',
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    processedRows: {
      type: Number,
      default: 0,
    },
    successRows: {
      type: Number,
      default: 0,
    },
    failedRows: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

batchSchema.index({ ownerId: 1, createdAt: -1 });

// Cascade delete hook: removing a Batch automatically deletes all associated BatchRows
batchSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  try {
    const BatchRow = mongoose.model('BatchRow');
    await BatchRow.deleteMany({ batchId: this._id });
    next();
  } catch (err) {
    next(err);
  }
});

// For query middleware (e.g. findOneAndDelete)
batchSchema.pre('findOneAndDelete', async function (next) {
  try {
    const doc = await this.model.findOne(this.getFilter());
    if (doc) {
      const BatchRow = mongoose.model('BatchRow');
      await BatchRow.deleteMany({ batchId: doc._id });
    }
    next();
  } catch (err) {
    next(err);
  }
});

batchSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  return this.save();
};

const Batch = mongoose.model('Batch', batchSchema);
module.exports = Batch;
