const { Vehicle, User } = require('../models');
const { sendResponse } = require('../utils/format');

const resolveOwnerId = async (req) => {
  if (req.user && req.user._id) return req.user._id;
  const demoUser = await User.findOne({ email: 'demo@mech-online.com' });
  return demoUser ? demoUser._id : null;
};

/**
 * GET /api/vehicles
 */
const getVehicles = async (req, res, next) => {
  try {
    const ownerId = await resolveOwnerId(req);
    const query = { deletedAt: null };

    if (req.user && req.user.organisationId) {
      query.$or = [
        { organisationId: req.user.organisationId },
        { ownerId: req.user._id },
      ];
    } else if (ownerId) {
      query.ownerId = ownerId;
    }

    const vehicles = await Vehicle.find(query).sort({ updatedAt: -1 }).lean();
    return sendResponse(res, 200, vehicles);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/vehicles
 */
const createVehicle = async (req, res, next) => {
  try {
    const ownerId = await resolveOwnerId(req);
    if (!ownerId) {
      const err = new Error('Owner ID is required to create a vehicle');
      err.status = 401;
      return next(err);
    }

    const organisationId = req.user?.organisationId || req.body.organisationId || null;

    const vehicle = await Vehicle.create({
      ...req.body,
      ownerId,
      organisationId,
    });

    return sendResponse(res, 201, vehicle);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/vehicles/:id
 */
const getVehicleById = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      deletedAt: null,
    }).lean();

    if (!vehicle) {
      const err = new Error('Vehicle not found');
      err.status = 404;
      return next(err);
    }

    return sendResponse(res, 200, vehicle);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/vehicles/:id
 */
const patchVehicle = async (req, res, next) => {
  try {
    const updated = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updated) {
      const err = new Error('Vehicle not found');
      err.status = 404;
      return next(err);
    }

    return sendResponse(res, 200, updated);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/vehicles/:id
 */
const deleteVehicle = async (req, res, next) => {
  try {
    const isHardDelete = req.query.hard === 'true';

    if (isHardDelete) {
      const deleted = await Vehicle.findByIdAndDelete(req.params.id);
      if (!deleted) {
        const err = new Error('Vehicle not found');
        err.status = 404;
        return next(err);
      }
      return sendResponse(res, 200, { id: req.params.id, deleted: true, mode: 'hard' });
    }

    const softDeleted = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true }
    );

    if (!softDeleted) {
      const err = new Error('Vehicle not found');
      err.status = 404;
      return next(err);
    }

    return sendResponse(res, 200, { id: req.params.id, deleted: true, mode: 'soft' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getVehicles,
  createVehicle,
  getVehicleById,
  patchVehicle,
  deleteVehicle,
};
