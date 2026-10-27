const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'staff', 'mechanic', 'viewer'],
      default: 'mechanic',
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const invitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['owner', 'staff', 'mechanic', 'viewer'],
      default: 'mechanic',
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: true }
);

const organisationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organisation name is required'],
      trim: true,
      maxlength: [150, 'Organisation name cannot exceed 150 characters'],
    },
    type: {
      type: String,
      enum: {
        values: ['garage', 'repair_shop', 'fleet'],
        message: '{VALUE} is not a valid organisation type',
      },
      required: [true, 'Organisation type is required'],
      index: true,
    },
    registrationNo: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      street: { type: String, default: '', trim: true },
      city: { type: String, default: '', trim: true },
      state: { type: String, default: '', trim: true },
      zip: { type: String, default: '', trim: true },
      country: { type: String, default: 'India', trim: true },
    },
    contactPerson: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    mechanicsCount: {
      type: Number,
      default: 1,
      min: [1, 'Mechanics count must be at least 1'],
    },
    fleetSize: {
      type: Number,
      default: 0,
      min: [0, 'Fleet size cannot be negative'],
    },
    logoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true,
    },
    members: [memberSchema],
    invitations: [invitationSchema],
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

organisationSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  return this.save();
};

const Organisation = mongoose.model('Organisation', organisationSchema);
module.exports = Organisation;
