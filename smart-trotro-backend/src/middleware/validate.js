'use strict';

/**
 * Validates req.body against a Joi schema.
 * Returns 400 with validation message on failure.
 *
 * Usage: router.post('/register', validate(registerSchema), controller)
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const messages = error.details.map((d) => d.message.replace(/"/g, "'"));
      return res.status(400).json({ success: false, message: messages.join('; ') });
    }
    req.body = value; // use sanitised value
    next();
  };
}

module.exports = { validate };
