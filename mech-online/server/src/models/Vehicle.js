const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
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
    make: {
      type: String,
      required: [true, 'Vehicle make is required (e.g. Tata, Mahindra, Toyota)'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Vehicle model is required (e.g. Nexon, Scorpio, Innova)'],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, 'Manufacturing year is required'],
      min: [1980, 'Year must be 1980 or later'],
      max: [new Date().getFullYear() + 1, 'Year cannot be in the far future'],
    },
    engineType: {
      type: String,
      enum: {
        values: ['Naturally Aspirated Petrol', 'Turbo Petrol', 'Diesel'],
        message: '{VALUE} is not a valid engine type',
      },
      required: [true, 'Engine type is required'],
    },
    registrationNo: {
      type: String,
      required: [true, 'Vehicle registration number / plate is required'],
      trim: true,
      uppercase: true,
    },
    odometer: {
      type: Number,
      required: [true, 'Current odometer reading is required'],
      min: [0, 'Odometer reading cannot be negative'],
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

vehicleSchema.index({ ownerId: 1, registrationNo: 1 });
vehicleSchema.index({ organisationId: 1, registrationNo: 1 });

vehicleSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  return this.save();
};

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
module.exports = Vehicle;
