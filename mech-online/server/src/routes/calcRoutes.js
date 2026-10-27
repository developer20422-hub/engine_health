const express = require('express');
const router = express.Router();
const calcController = require('../controllers/calcController');
const { validate } = require('../middleware/validate');
const { optionalAuth, checkResourceOwnership } = require('../middleware/auth');
const { Calculation } = require('../models');
const {
  calculationInputSchema,
  idParamSchema,
  paginationQuerySchema,
} = require('../utils/validators');

// Public pure computation route (no auth or storage required)
router.post(
  '/calc',
  validate(calculationInputSchema, 'body'),
  calcController.computeCalculation
);

// Calculation CRUD routes
router.post(
  '/calculations',
  optionalAuth,
  validate(calculationInputSchema, 'body'),
  calcController.saveCalculation
);

router.get(
  '/calculations',
  optionalAuth,
  validate(paginationQuerySchema, 'query'),
  calcController.getCalculations
);

router.get(
  '/calculations/:id',
  optionalAuth,
  validate(idParamSchema, 'params'),
  checkResourceOwnership(Calculation),
  calcController.getCalculationById
);

router.patch(
  '/calculations/:id',
  optionalAuth,
  validate(idParamSchema, 'params'),
  checkResourceOwnership(Calculation),
  calcController.patchCalculation
);

router.delete(
  '/calculations/:id',
  optionalAuth,
  validate(idParamSchema, 'params'),
  checkResourceOwnership(Calculation),
  calcController.deleteCalculation
);

module.exports = router;

