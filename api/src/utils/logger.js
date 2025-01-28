import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { getRequestId } from './requestId.js';

// Alternative solution for a dedicated request id per request: https://github.com/puzpuzpuz/cls-rtracer?tab=readme-ov-file#pino

// Have an OpenTelemetry format: https://github.com/pinojs/pino/blob/main/docs/transports.md#pino-opentelemetry-transport

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  mixin() {
    return {
      requestId: getRequestId(),
    };
  },
});

export const loggerMiddleware = pinoHttp({
  logger,
});
