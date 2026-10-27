const jwt = require('jsonwebtoken');

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const getAccessSecret = () => process.env.JWT_ACCESS_SECRET || 'dev_access_fallback_secret_39482934';
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || 'dev_refresh_fallback_secret_93847293';

/**
 * Generate 15-minute Access Token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      accountType: user.accountType,
      organisationId: user.organisationId ? user.organisationId.toString() : null,
    },
    getAccessSecret(),
    { expiresIn: ACCESS_EXPIRES_IN }
  );
};

const crypto = require('crypto');

/**
 * Generate 7-day Refresh Token with unique jti claim
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      jti: crypto.randomUUID(),
    },
    getRefreshSecret(),
    { expiresIn: REFRESH_EXPIRES_IN }
  );
};

/**
 * Verify Access Token
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, getAccessSecret());
  } catch (err) {
    return null;
  }
};

/**
 * Verify Refresh Token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, getRefreshSecret());
  } catch (err) {
    return null;
  }
};

/**
 * Set HTTP-Only Secure SameSite cookies
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';

  // 15-minute access token cookie
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 mins
    path: '/',
  });

  // 7-day refresh token cookie
  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }
};

/**
 * Clear Authentication Cookies
 */
const clearAuthCookies = (res) => {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/',
  };
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
};
