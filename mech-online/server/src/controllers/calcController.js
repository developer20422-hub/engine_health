const { Calculation, Vehicle, User } = require('../models');
const calcService = require('../services/calcService');
const { sendResponse } = require('../utils/format');

// Helper to resolve an ownerId (from authenticated user or demo user)
const resolveOwnerId = async (req) => {
  if (req.user && req.user._id) return req.user._id;
  const demoUser = await User.findOne({ email: 'demo@mech-online.com' });
  return demoUser ? demoUser._id : null;
};

/**
 * POST /api/calc
 * Pure calculation endpoint - runs calculations without persisting to DB
 */
const computeCalculation = async (req, res, next) => {
  try {
    const diagnosticResults = calcService.calculateDiagnostics(req.body);
    return sendResponse(res, 200, diagnosticResults);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/calculations
 * Computes calculation and saves record into MongoDB Atlas
 */
const saveCalculation = async (req, res, next) => {
  try {
    const ownerId = await resolveOwnerId(req);
    if (!ownerId) {
      const err = new Error('Owner ID could not be identified');
      err.status = 401;
      return next(err);
    }

    const calculated = calcService.calculateDiagnostics(req.body);
    const organisationId = req.user?.organisationId || req.body.organisationId || null;

    const newRecord = await Calculation.create({
      ownerId,
      organisationId,
      vehicleId: req.body.vehicleId || null,
      customerName: req.body.customerName || '',
      customerPhone: req.body.customerPhone || '',
      jobNotes: req.body.jobNotes || '',
      inputs: calculated.inputs,
      results: calculated.results,
      source: req.body.source || 'manual',
    });

    // Optionally update vehicle odometer if linked
    if (req.body.vehicleId && req.body.currentMileage) {
      await Vehicle.updateOne(
        { _id: req.body.vehicleId, odometer: { $lt: req.body.currentMileage } },
        { $set: { odometer: req.body.currentMileage } }
      );
    }

    return sendResponse(res, 201, newRecord);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/calculations
 * Retrieves calculations list for the current owner/organisation with pagination & filter
 */
const getCalculations = async (req, res, next) => {
  try {
    const ownerId = await resolveOwnerId(req);
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {
      deletedAt: null,
    };

    if (req.user && req.user.organisationId) {
      query.$or = [
        { organisationId: req.user.organisationId },
        { ownerId: req.user._id },
      ];
    } else if (ownerId) {
      query.ownerId = ownerId;
    }

    if (req.query.source) query.source = req.query.source;

    // Filter by recommendation status
    if (req.query.status && req.query.status !== 'all') {
      query['results.serviceRecommendation'] = new RegExp(req.query.status, 'i');
    }

    // Filter by search query (customer, grade, notes)
    if (req.query.search) {
      const s = req.query.search.trim();
      const sRegex = new RegExp(s, 'i');
      query.$or = [
        { customerName: sRegex },
        { 'inputs.saeBaseline': sRegex },
        { jobNotes: sRegex },
      ];
    }

    const [items, total] = await Promise.all([
      Calculation.find(query)
        .populate('vehicleId', 'make model registrationNo year')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Calculation.countDocuments(query),
    ]);

    return sendResponse(res, 200, {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/calculations/:id
 * Retrieves a single calculation by ID
 */
const getCalculationById = async (req, res, next) => {
  try {
    const record = await Calculation.findOne({
      _id: req.params.id,
      deletedAt: null,
    }).populate('vehicleId', 'make model registrationNo year');

    if (!record) {
      const err = new Error('Calculation record not found');
      err.status = 404;
      return next(err);
    }

    return sendResponse(res, 200, record);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/calculations/:id
 * Updates calculation record metadata or advisory note
 */
const patchCalculation = async (req, res, next) => {
  try {
    const allowedUpdates = {};
    if (req.body.mechanicAdvisory) allowedUpdates['results.mechanicAdvisory'] = req.body.mechanicAdvisory;
    if (req.body.vehicleId !== undefined) allowedUpdates.vehicleId = req.body.vehicleId;

    const updated = await Calculation.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );

    if (!updated) {
      const err = new Error('Calculation record not found');
      err.status = 404;
      return next(err);
    }

    return sendResponse(res, 200, updated);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/calculations/:id
 * Soft deletes calculation by default (or hard deletes if ?hard=true)
 */
const deleteCalculation = async (req, res, next) => {
  try {
    const isHardDelete = req.query.hard === 'true';

    if (isHardDelete) {
      const deleted = await Calculation.findByIdAndDelete(req.params.id);
      if (!deleted) {
        const err = new Error('Calculation record not found');
        err.status = 404;
        return next(err);
      }
      return sendResponse(res, 200, { id: req.params.id, deleted: true, mode: 'hard' });
    }

    const softDeleted = await Calculation.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true }
    );

    if (!softDeleted) {
      const err = new Error('Calculation record not found');
      err.status = 404;
      return next(err);
    }

    return sendResponse(res, 200, { id: req.params.id, deleted: true, mode: 'soft' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  computeCalculation,
  saveCalculation,
  getCalculations,
  getCalculationById,
  patchCalculation,
  deleteCalculation,
};
