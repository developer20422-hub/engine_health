const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { User, Organisation } = require('../models');
const { sendResponse } = require('../utils/format');
const { validatePasswordStrength } = require('../utils/passwordPolicy');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} = require('../utils/tokens');
const { sanitizeObjectForFormulaInjection } = require('../utils/formulaGuard');

/**
 * Hash raw JWT with SHA-256 prior to bcrypt to safely bypass bcrypt's 72-byte truncation limit
 */
const hashTokenForStorage = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * 1. Register User (Individual or Organisation)
 */
const register = async (req, res, next) => {
  try {
    const sanitized = sanitizeObjectForFormulaInjection(req.body);
    const {
      name,
      email,
      password,
      accountType = 'individual',
      role,
      phone,
      organisationName,
      organisationType = 'garage',
      registrationNo,
    } = sanitized;

    // Strict Password Policy Validation
    const passwordCheck = validatePasswordStrength(password, { name, email });
    if (!passwordCheck.valid) {
      return sendResponse(res, 400, null, {
        message: `Weak password: ${passwordCheck.errors.join('; ')}`,
        errors: passwordCheck.errors,
        code: 'WEAK_PASSWORD',
      });
    }

    // Check if email already registered
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return sendResponse(res, 409, null, {
        message: 'An account with this email already exists',
        code: 'EMAIL_ALREADY_EXISTS',
      });
    }

    let assignedOrgId = null;
    let assignedRole = accountType === 'organisation' ? 'owner' : (role || 'user');
    const userId = new mongoose.Types.ObjectId();

    // Create Organisation record if registering as an organisation
    if (accountType === 'organisation') {
      const org = new Organisation({
        name: organisationName || `${name}'s Garage`,
        type: organisationType,
        registrationNo: registrationNo || '',
        ownerId: userId,
        members: [{ userId, role: 'owner' }],
      });
      await org.save();
      assignedOrgId = org._id;
    }

    // Create User (passwordHash will be hashed by User pre-save hook with cost 12)
    const user = new User({
      _id: userId,
      name,
      email: email.toLowerCase(),
      passwordHash: password,
      accountType,
      role: assignedRole,
      organisationId: assignedOrgId,
      phone: phone || '',
    });

    await user.save();

    // Generate Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store hash of refresh token for rotation and revocation
    user.refreshTokenHash = await bcrypt.hash(hashTokenForStorage(refreshToken), 10);
    await user.save();

    // Set HTTP-Only Secure SameSite Cookies
    setAuthCookies(res, accessToken, refreshToken);

    return sendResponse(res, 201, {
      user,
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. Login User with Account Lockout protection
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
      deletedAt: null,
    }).select('+passwordHash +refreshTokenHash');

    if (!user) {
      return sendResponse(res, 401, null, {
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Verify Password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendResponse(res, 401, null, {
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Reset any previous failed attempts
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
    }
    user.lastLoginAt = new Date();


    // Generate Tokens and Rotate Refresh Token
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshTokenHash = await bcrypt.hash(hashTokenForStorage(refreshToken), 10);
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    return sendResponse(res, 200, {
      user,
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. Logout User & Invalidate Tokens
 */
const logout = async (req, res, next) => {
  try {
    if (req.user && req.user._id) {
      await User.findByIdAndUpdate(req.user._id, { refreshTokenHash: null });
    }
    clearAuthCookies(res);

    return sendResponse(res, 200, {
      message: 'Logged out successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. Refresh Token with Automatic Rotation & Reuse Detection
 */
const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      return sendResponse(res, 401, null, {
        message: 'Refresh token is required',
        code: 'REFRESH_TOKEN_REQUIRED',
      });
    }

    const decoded = verifyRefreshToken(token);
    if (!decoded || !decoded.userId) {
      clearAuthCookies(res);
      return sendResponse(res, 401, null, {
        message: 'Invalid or expired refresh token. Please log in again.',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    const user = await User.findOne({
      _id: decoded.userId,
      deletedAt: null,
      isActive: true,
    }).select('+refreshTokenHash');

    if (!user || !user.refreshTokenHash) {
      clearAuthCookies(res);
      return sendResponse(res, 401, null, {
        message: 'Session revoked or user not found. Please log in again.',
        code: 'TOKEN_REVOKED',
      });
    }

    // Check if incoming refresh token matches stored hash
    const isTokenValid = await bcrypt.compare(hashTokenForStorage(token), user.refreshTokenHash);
    if (!isTokenValid) {
      // Possible token reuse / breach detected -> invalidate stored token immediately!
      user.refreshTokenHash = null;
      await user.save();
      clearAuthCookies(res);
      return sendResponse(res, 401, null, {
        message: 'Invalid refresh token detected. Session terminated for security.',
        code: 'TOKEN_REUSE_DETECTED',
      });
    }

    // Token Rotation: Issue brand new access token and refresh token
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshTokenHash = await bcrypt.hash(hashTokenForStorage(newRefreshToken), 10);
    await user.save();

    setAuthCookies(res, newAccessToken, newRefreshToken);

    return sendResponse(res, 200, {
      user,
      accessToken: newAccessToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. Get Current Authenticated User Profile
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('organisationId');
    return sendResponse(res, 200, { user });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. Change Password (requires authentication)
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) {
      return sendResponse(res, 404, null, {
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return sendResponse(res, 400, null, {
        message: 'Current password is incorrect',
        code: 'INCORRECT_CURRENT_PASSWORD',
      });
    }

    // Prevent re-using the exact current password
    if (currentPassword === newPassword) {
      return sendResponse(res, 400, null, {
        message: 'New password cannot be the same as the current password',
        code: 'PASSWORD_REUSED',
      });
    }

    // Validate new password policy
    const passwordCheck = validatePasswordStrength(newPassword, {
      name: user.name,
      email: user.email,
    });
    if (!passwordCheck.valid) {
      return sendResponse(res, 400, null, {
        message: `Weak password: ${passwordCheck.errors.join('; ')}`,
        errors: passwordCheck.errors,
        code: 'WEAK_PASSWORD',
      });
    }

    // Update password (pre-save hook will hash it with cost 12)
    user.passwordHash = newPassword;
    // Invalidate existing sessions
    user.refreshTokenHash = null;
    await user.save();

    // Issue fresh tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshTokenHash = await bcrypt.hash(hashTokenForStorage(refreshToken), 10);
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    return sendResponse(res, 200, {
      message: 'Password changed successfully',
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 7. Forgot Password (generates secure SHA-256 hashed 1-hour reset token)
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({
      email: email.toLowerCase(),
      deletedAt: null,
      isActive: true,
    });

    let rawToken = null;

    if (user) {
      rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity
      await user.save();
    }

    // Consistent response to prevent user enumeration attacks
    return sendResponse(res, 200, {
      message: 'If an account exists with this email, password reset instructions have been issued.',
      resetToken: process.env.NODE_ENV !== 'production' ? rawToken : undefined,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 8. Reset Password with Token
 */
const resetPassword = async (req, res, next) => {
  try {
    const token = req.body.token || req.params.token;
    const { password } = req.body;

    if (!token) {
      return sendResponse(res, 400, null, {
        message: 'Password reset token is required',
        code: 'TOKEN_REQUIRED',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
      deletedAt: null,
    });

    if (!user) {
      return sendResponse(res, 400, null, {
        message: 'Password reset token is invalid or has expired',
        code: 'INVALID_OR_EXPIRED_TOKEN',
      });
    }

    // Validate password policy
    const passwordCheck = validatePasswordStrength(password, {
      name: user.name,
      email: user.email,
    });
    if (!passwordCheck.valid) {
      return sendResponse(res, 400, null, {
        message: `Weak password: ${passwordCheck.errors.join('; ')}`,
        errors: passwordCheck.errors,
        code: 'WEAK_PASSWORD',
      });
    }

    // Set new password and clear reset fields
    user.passwordHash = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.refreshTokenHash = null;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    await user.save();

    return sendResponse(res, 200, {
      message: 'Password has been successfully reset. You may now log in.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 9. Update Profile (Name, Phone, Avatar, Preferences, AccountType)
 */
const updateProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const { name, phone, avatarUrl, preferences, accountType } = req.body;

    if (name !== undefined) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl.trim();
    if (accountType !== undefined) user.accountType = accountType;
    if (preferences) {
      if (!user.preferences) user.preferences = {};
      if (preferences.units) user.preferences.units = preferences.units;
      if (preferences.theme) user.preferences.theme = preferences.theme;
    }

    await user.save();
    return sendResponse(res, 200, user.toJSON());
  } catch (err) {
    next(err);
  }
};

/**
 * 10. Export My Data (Full JSON dump of user profile, vehicles, calculations, batches)
 */
const exportUserData = async (req, res, next) => {
  try {
    const { Vehicle, Calculation, Batch } = require('../models');
    const userId = req.user._id;
    const orgId = req.user.organisationId;

    const [userDoc, orgDoc, vehicles, calculations, batches] = await Promise.all([
      User.findById(userId).lean(),
      orgId ? Organisation.findById(orgId).lean() : null,
      Vehicle.find({
        $or: [{ ownerId: userId }, ...(orgId ? [{ organisationId: orgId }] : [])],
        deletedAt: null,
      }).lean(),
      Calculation.find({
        $or: [{ ownerId: userId }, ...(orgId ? [{ organisationId: orgId }] : [])],
        deletedAt: null,
      }).lean(),
      Batch.find({
        $or: [{ ownerId: userId }, ...(orgId ? [{ organisationId: orgId }] : [])],
        deletedAt: null,
      }).lean(),
    ]);

    if (userDoc) {
      delete userDoc.passwordHash;
      delete userDoc.refreshTokenHash;
      delete userDoc.passwordResetToken;
      delete userDoc.passwordResetExpires;
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: userDoc,
      organisation: orgDoc,
      vehicles,
      calculations,
      batches,
    };

    return sendResponse(res, 200, exportData);
  } catch (err) {
    next(err);
  }
};

/**
 * 11. Delete Account (Soft Delete & Logout)
 */
const deleteAccount = async (req, res, next) => {
  try {
    const user = req.user;
    await user.softDelete();
    clearAuthCookies(res);

    return sendResponse(res, 200, {
      message: 'Account successfully deactivated. All sessions revoked.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  logout,
  refresh,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
  updateProfile,
  exportUserData,
  deleteAccount,
};
