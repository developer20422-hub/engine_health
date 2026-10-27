const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateBody } = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} = require('../utils/validators');

// Public Auth Endpoints
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);
router.post('/reset-password/:token', authController.resetPassword);


// Authenticated Endpoints
router.get('/me', requireAuth, authController.getMe);
router.post('/logout', requireAuth, authController.logout);
router.post('/change-password', requireAuth, validateBody(changePasswordSchema), authController.changePassword);
router.patch('/profile', requireAuth, validateBody(updateProfileSchema), authController.updateProfile);
router.get('/export-data', requireAuth, authController.exportUserData);
router.delete('/account', requireAuth, authController.deleteAccount);

module.exports = router;
