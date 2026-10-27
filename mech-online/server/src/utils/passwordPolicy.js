/**
 * Simple but Effective Password Policy Validator
 * Requires a minimum of 8 characters.
 */

const validatePasswordStrength = (password, context = {}) => {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  // Minimum 8 characters
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validatePasswordStrength,
};
