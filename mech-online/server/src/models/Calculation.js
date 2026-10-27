const mongoose = require('mongoose');

const calculationSchema = new mongoose.Schema(
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
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
      index: true,
    },
    customerName: {
      type: String,
      default: '',
      trim: true,
    },
    customerPhone: {
      type: String,
      default: '',
      trim: true,
    },
    jobNotes: {
      type: String,
      default: '',
      trim: true,
    },
    inputs: {
      saeBaseline: {
        type: String,
        required: [true, 'SAE baseline grade is required'],
        enum: ['0W-20', '5W-30', '10W-40', '15W-40', '20W-50'],
      },
      effluxTime: {
        type: Number,
        required: [true, 'Efflux flow time is required'],
        min: [10, 'Efflux flow time must be at least 10 seconds'],
        max: [200, 'Efflux flow time cannot exceed 200 seconds'],
      },
      measuredViscosity: {
        type: Number,
        required: [true, 'Measured kinematic viscosity is required'],
        min: [10, 'Viscosity must be at least 10 CSt'],
        max: [400, 'Viscosity cannot exceed 400 cSt'],
      },
      temperature: {
        type: Number,
        default: 27.5,
        min: [15, 'WORKSHOP temperature must be at least 15 deg C'],
        max: [45, 'WORKSHOP temperature cannot exceed 45 deg C'],
      },
      blotterScore: {
        type: Number,
        default: 100,
        enum: [15, 45, 75, 100],
      },
      baseOilType: {
        type: String,
        enum: ['Mineral', 'Semi-Synthetic', 'Full-Synthetic'],
        default: 'Full-Synthetic',
      },
      engineType: {
        type: String,
        enum: ['Naturally Aspirated Petrol', 'Turbo Petrol', 'Diesel'],
        default: 'Naturally Aspirated Petrol',
      },
      drivingCondition: {
        type: String,
        enum: ['Highway', 'Mixed Urban', 'City Stop-and-Go'],
        default: 'Mixed Urban',
      },
      currentMileage: {
        type: Number,
        default: 0,
        min: [0, 'Current mileage cannot be negative'],
      },
    },
    results: {
      ohi: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      rulKm: {
        type: Number,
        required: true,
        min: 0,
        max: 12000,
      },
      viscosityRatio: {
        type: Number,
        required: true,
      },
      devPct: {
        type: Number,
        required: true,
      },
      serviceRecommendation: {
        type: String,
        enum: ['Optimal', 'Stable', 'Service Soon', 'Critical'],
        required: true,
      },
      mechanicAdvisory: {
        type: String,
        default: '',
      },
      remainingHours: {
        type: String || Number,
        default: 0,
      },
      nextServiceOdometer: {
        type: String || Number,
        default: 0,
      },
    },
    source: {
      type: String,
      enum: ['manual', 'batch'],
      default: 'manual',
      index: true,
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

calculationSchema.index({ ownerId: 1, createdAt: -1 });
calculationSchema.index({ organisationId: 1, createdAt: -1 });
calculationSchema.index({ vehicleId: 1, createdAt: -1 });

calculationSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  return this.save();
};

const Calculation = mongoose.model('Calculation', calculationSchema);
module.exports = Calculation;