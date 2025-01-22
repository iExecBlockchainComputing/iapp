import { logger } from './logger.js';

/**
 * should be the last middleware
 */
export const errorHandlerMiddleware = (err, req, res, next) => {
  logger.error({ err }, 'Unexpected error');
  res.status(500).json({
    success: false,
    error: 'Internal error',
  });
};
