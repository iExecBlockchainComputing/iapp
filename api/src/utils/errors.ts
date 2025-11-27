import { ValidationError } from 'zod-validation-error';
import { logger } from './logger.js';
import type { ErrorRequestHandler } from 'express';

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
 * Returns 410 gone, error message and workaround are exposed
 */
export class OutdatedClientError extends OperationalError {
  /**
   * A suggested workaround for the client
   */
  workaround: string;
  constructor(
    message?: string,
    options?: ErrorOptions & { workaround?: string }
  ) {
    super(message, options);
    if (options?.workaround) {
      this.workaround = options.workaround;
    } else {
      this.workaround = 'Please update @iexec/iapp to the latest version.';
    }
  }
}

/**
 * Clean error for sending to client
 */
export const errorHandler = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  err: any,
  callback: (errorDigest: { code: number; error: string }) => void
) => {
  if (
    // handle Zod validation errors
    err instanceof ValidationError ||
    // handle body-parser errors
    (err.status && err.status === 400)
  ) {
    logger.info({ err }, err.name);
    callback({
      code: 400,
      error: err.toString(),
    });
  }
  // handle outdated client errors
  else if (err instanceof OutdatedClientError) {
    logger.info({ err }, err.name);
    callback({
      code: 410,
      error: `${err.toString()}
${err.workaround}`,
    });
  }
  // handle business errors
  else if (err instanceof ForbiddenError) {
    logger.info({ err }, err.name);
    callback({
      code: 403,
      error: err.toString(),
    });
  }
  // everything else is unexpected and treated as internal error
  else {
    logger.error({ err }, 'Unexpected error');
    callback({
      code: 500,
      error: 'Internal error',
    });
  }
};

/**
 * should be the last middleware
 */
export const errorHandlerMiddleware: ErrorRequestHandler = (
  err,
  req,
  res,
  next
) => {
  if (res.headersSent) {
    logger.warn(
      { err },
      'Error occurred after response headers have been sent'
    );
    return next(err);
  }
  errorHandler(err, ({ code, error }) => {
    res.status(code).json({
      success: false,
      error,
    });
  });
};
