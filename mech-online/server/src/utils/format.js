/**
 * Unified Formatting & Response Utility for Mech Online
 * Enforces single precision, rounding, and API response schema everywhere.
 */

// Rounding helper
const roundTo = (num, decimals = 0) => {
  if (typeof num !== 'number' || isNaN(num)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
};

// Formatter functions
const formatViscosity = (val) => roundTo(val, 1);
const formatFlowTime = (val) => roundTo(val, 1);
const formatDeviation = (val) => roundTo(val, 1);
const formatRatio = (val) => roundTo(val, 4);
const formatScore = (val) => Math.min(100, Math.max(0, Math.round(val)));
const formatDistance = (val) => Math.max(0, Math.round(val));
const formatHours = (val) => Math.max(0, Math.round(val));

/**
 * Standardized API Response Envelope
 * Guaranteed shape: { success: boolean, data: any, error: any }
 */
const sendResponse = (res, statusCode = 200, data = null, error = null) => {
  const success = statusCode >= 200 && statusCode < 300;
  return res.status(statusCode).json({
    success,
    data: success ? data : null,
    error: success ? null : error,
  });
};

module.exports = {
  roundTo,
  formatViscosity,
  formatFlowTime,
  formatDeviation,
  formatRatio,
  formatScore,
  formatDistance,
  formatHours,
  sendResponse,
};
