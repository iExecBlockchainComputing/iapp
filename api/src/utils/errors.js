import { ValidationError } from 'zod-validation-error';
import { logger } from './logger.js';

/**
 * An error that can be exposed to the user
 */
class OperationalError extends Error {
  toString() {
    return this.message;
  }
}
/**
 * Returns 403 forbidden, error message is exposed
 */
export class ForbiddenError extends OperationalError {}

/**
 * should be the last middleware
 */
export const errorHandlerMiddleware = (err, req, res, next) => {
  if (res.headersSent) {
    logger.warn(
      { err },
      'Error occurred after response headers have been sent'
    );
    return next(err);
  }
  if (
    // handle Zod validation errors
    err instanceof ValidationError ||
    // handle body-parser errors
    (err.status && err.status === 400)
  ) {
    logger.info({ err }, err.name);
    res.status(400).json({
      success: false,
      error: err.toString(),
    });
  }
  // handle business errors
  else if (err instanceof ForbiddenError) {
    logger.info({ err }, err.name);
    res.status(403).json({
      success: false,
      error: err.toString(),
    });
  }
  // everything else is unexpected and treated as internal error
  else {
    logger.error({ err }, 'Unexpected error');
    res.status(500).json({
      success: false,
      error: 'Internal error',
    });
  }
};
