const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { validate } = require('../middleware/validate');
const { optionalAuth, checkResourceOwnership } = require('../middleware/auth');
const { Vehicle } = require('../models');
const {
  createVehicleSchema,
  updateVehicleSchema,
  idParamSchema,
} = require('../utils/validators');

router.get('/', optionalAuth, vehicleController.getVehicles);

router.post(
  '/',
  optionalAuth,
  validate(createVehicleSchema, 'body'),
  vehicleController.createVehicle
);

router.get(
  '/:id',
  optionalAuth,
  validate(idParamSchema, 'params'),
  checkResourceOwnership(Vehicle),
  vehicleController.getVehicleById
);

router.patch(
  '/:id',
  optionalAuth,
  validate(idParamSchema, 'params'),
  validate(updateVehicleSchema, 'body'),
  checkResourceOwnership(Vehicle),
  vehicleController.patchVehicle
);

router.delete(
  '/:id',
  optionalAuth,
  validate(idParamSchema, 'params'),
  checkResourceOwnership(Vehicle),
  vehicleController.deleteVehicle
);

module.exports = router;

