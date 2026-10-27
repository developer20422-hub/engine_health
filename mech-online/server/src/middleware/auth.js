const { verifyAccessToken } = require('../utils/tokens');
const { User } = require('../models');
const { sendResponse } = require('../utils/format');

/**
 * Require valid JWT Access Token (from httpOnly cookie or Authorization header)
 */
const requireAuth = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendResponse(res, 401, null, {
        message: 'Authentication required. Please log in.',
        code: 'UNAUTHORIZED',
      });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || !decoded.userId) {
      return sendResponse(res, 401, null, {
        message: 'Access token expired or invalid. Please refresh token.',
        code: 'TOKEN_EXPIRED',
      });
    }

    const user = await User.findOne({
      _id: decoded.userId,
      deletedAt: null,
      isActive: true,
    });

    if (!user) {
      return sendResponse(res, 401, null, {
        message: 'Account not found or has been deactivated.',
        code: 'USER_NOT_FOUND',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Optional Auth: Attaches user if valid token present, but does not block if missing
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded && decoded.userId) {
        const user = await User.findOne({
          _id: decoded.userId,
          deletedAt: null,
          isActive: true,
        });
        if (user) req.user = user;
      }
    }
    next();
  } catch (err) {
    next();
  }
};

/**
 * Require specific role: ['owner', 'staff', 'user']
 */
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendResponse(res, 401, null, {
        message: 'Authentication required.',
        code: 'UNAUTHORIZED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendResponse(res, 403, null, {
        message: `Forbidden: This resource requires one of the following roles: [${allowedRoles.join(', ')}]`,
        code: 'FORBIDDEN',
      });
    }

    next();
  };
};

/**
 * Require specific account type: ['individual', 'organisation']
 */
const requireAccountType = (allowedTypes = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendResponse(res, 401, null, {
        message: 'Authentication required.',
        code: 'UNAUTHORIZED',
      });
    }

    if (!allowedTypes.includes(req.user.accountType)) {
      return sendResponse(res, 403, null, {
        message: `Forbidden: This feature is only available for [${allowedTypes.join(', ')}] accounts`,
        code: 'ACCOUNT_TYPE_FORBIDDEN',
      });
    }

    next();
  };
};

/**
 * Guard to prevent accessing other users' resources (Returns 403/404)
 */
const checkResourceOwnership = (Model, idParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[idParam];
      const doc = await Model.findOne({ _id: resourceId, deletedAt: null });

      if (!doc) {
        return sendResponse(res, 404, null, {
          message: 'Resource not found',
          code: 'RESOURCE_NOT_FOUND',
        });
      }

      // Check user ownership or organization membership if authenticated
      if (req.user) {
        const isOwner = doc.ownerId && doc.ownerId.toString() === req.user._id.toString();
        const isSameOrg =
          doc.organisationId &&
          req.user.organisationId &&
          doc.organisationId.toString() === req.user.organisationId.toString();

        if (!isOwner && !isSameOrg) {
          return sendResponse(res, 403, null, {
            message: 'Forbidden: You do not have permission to access or modify this resource',
            code: 'FORBIDDEN_RESOURCE_ACCESS',
          });
        }
      }

      req.resource = doc;
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
  requireAccountType,
  checkResourceOwnership,
};
