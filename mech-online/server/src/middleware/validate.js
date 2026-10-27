const { ZodError } = require('zod');

/**
 * Higher-order middleware to validate request payload with Zod schemas
 * @param {import('zod').ZodSchema} schema 
 * @param {'body' | 'params' | 'query'} [source='body']
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issuesList = err.issues || err.errors || [];
        const issues = issuesList.map(e => ({
          field: Array.isArray(e.path) ? e.path.join('.') : '',
          message: e.message,
        }));
        
        const validationError = new Error(issues.map(i => i.message).join('; ') || 'Validation failed');
        validationError.status = 400;
        validationError.code = 'VALIDATION_ERROR';
        validationError.details = issues;
        return next(validationError);
      }
      next(err);
    }
  };
};

const validateBody = (schema) => validate(schema, 'body');
const validateQuery = (schema) => validate(schema, 'query');
const validateParams = (schema) => validate(schema, 'params');

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
};

