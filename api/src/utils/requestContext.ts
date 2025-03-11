import { createNamespace, getNamespace } from 'cls-hooked';

export const session = getNamespace('request') || createNamespace('request');

/**
 * bind session to a callback
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const bindSession = <F extends Function>(fn: F) => session.bind(fn);
