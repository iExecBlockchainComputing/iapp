import { v4 as uuidv4 } from 'uuid';
import { session } from './requestContext.js';
import type { RequestHandler } from 'express';

export const requestIdMiddleware: RequestHandler = (_req, _res, next) => {
  session.run(() => {
    const id = uuidv4();
    session.set('requestId', id);
    next();
  });
};

export const getRequestId = (): string | undefined => {
  try {
    // may throw if executed outside of the callback chain
    return session.get('requestId') as string;
  } catch {
    return undefined;
  }
};
