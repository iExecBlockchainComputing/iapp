import type { IncomingMessage } from 'node:http';
import { WebSocket, RawData, type WebSocketServer } from 'ws';
import { type Duplex } from 'node:stream';
import { v4 as uuidv4 } from 'uuid';
import { pack, unpack } from 'msgpackr';
import { bindSession, session } from './requestContext.js';
import { logger } from './logger.js';
import { sleep } from './utils.js';
import { errorHandler } from './errors.js';

export type WsMessage = {
  type:
    | 'NEW_SESSION'
    | 'RECOVERED_SESSION'
    | 'REQUEST'
    | 'RESPONSE'
    | 'INFO'
    | 'ACK';
  /**
   * message reception acknowledge code
   */
  ack?: number;
  /**
   * sent with type REQUEST and RESPONSE
   */
  target?: string;
  /**
   * sent with type RESPONSE
   */
  success?: boolean;
  /**
   * sent with type RESPONSE when success: false
   */
  error?: string;
  /**
   * sent with type RESPONSE when success: false
   */
  code?: number;
  /**
   * sent with type RESPONSE  when success: true
   */
  result?: object;
};

/**
 * serialize data to send through a websocket
 */
function serializeData<T extends WsMessage>(data: T) {
  try {
    return pack(data);
  } catch {
    throw Error('Failed to serialize WS data');
  }
}

/**
 * deserialize data received through a websocket
 */
export function deserializeData<T extends WsMessage>(data: RawData): T {
  try {
    return unpack(data as Buffer);
  } catch {
    throw Error('Failed to deserialize WS data');
  }
}

type WsLiveCheck = { isAlive: boolean };
type WsAckNonce = { ack: number };

const wsSessions: Record<
  string,
  { ws: WebSocket & WsAckNonce; cleanupTimeout?: NodeJS.Timeout }
> = {};

/**
 * use heartbeat to ensure websocket liveness
 * ws connection must be handled by bootstrapWsSession or will be terminated after the first heartbeat round
 */
export const useHeartbeat = (wss: WebSocketServer) => {
  const HEARTBEAT_INTERVAL = 15_000;
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket & WsLiveCheck) => {
      if (ws.isAlive === false) {
        logger.warn('ws heartbeat failed closing connection');
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);
  wss.on('close', () => {
    clearInterval(interval);
  });
};

export const bootstrapWsSession =
  ({
    wss,
    socket,
    requestRouter,
  }: {
    wss: WebSocketServer;
    socket: Duplex;
    requestRouter: (
      requestTarget: string
    ) => (requestMessage: object) => Promise<object> | void;
  }) =>
  (ws: WebSocket & WsLiveCheck & WsAckNonce, request: IncomingMessage) => {
    /**
     * clean reference to the session after this
     */
    const SESSION_TIMEOUT = 60_000;

    // handle heartbeat reset
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    let isNew = false;

    // handle reconnection based on sid
    let sid = request.headers['sec-websocket-protocol'];
    if (sid && wsSessions[sid] && wsSessions[sid].cleanupTimeout) {
      clearTimeout(wsSessions[sid].cleanupTimeout);
      delete wsSessions[sid].cleanupTimeout;
      wsSessions[sid] = { ws };
      logger.info({ sid }, 'recovering ws session');
      ws.send(serializeData({ type: 'RECOVERED_SESSION', ack: 0, sid }));
    } else {
      sid = uuidv4();
      wsSessions[sid] = { ws };
      logger.info({ sid }, 'new ws session');
      ws.send(serializeData({ type: 'NEW_SESSION', ack: 0, sid }));
      isNew = true;
    }

    ws.ack = 1;
    wsSessions[sid] = { ws };
    // attach ws sid to the session
    session.set('websocketSid', sid);

    const destroySession = () => {
      delete wsSessions[sid];
      logger.info({ sid }, 'ws session destroyed');
    };

    ws.on(
      'close',
      // bind session to handler
      bindSession((code) => {
        ws.removeAllListeners();
        ws.terminate();
        delete wsSessions[sid].ws;
        logger.info({ code, sid }, 'ws closed');
        if (code === 1000) {
          destroySession();
        } else {
          // when ws connection breaks keep the session for 60sec
          wsSessions[sid].cleanupTimeout = setTimeout(
            destroySession,
            SESSION_TIMEOUT
          );
        }
      })
    );

    ws.on(
      'error',
      // bind session to handler
      bindSession((error) => {
        logger.warn(error, 'ws error');
        ws.close();
      })
    );

    wss.emit('connection', socket, request);

    if (isNew) {
      const handleFirstRequest = bindSession((data: RawData) => {
        try {
          const message = deserializeData(data);
          if ((message.type === 'REQUEST', message.target)) {
            const requestHandler = requestRouter(message.target);
            if (requestHandler) {
              // request handled, stop listening new requests
              ws.removeListener('message', handleFirstRequest);
              (requestHandler as (message: object) => Promise<object>)(message)
                // handle success
                .then(async (result) => {
                  await sendWsMessage({
                    type: 'RESPONSE',
                    target: message.target,
                    success: true,
                    result,
                  });
                })
                // handle error
                .catch((e) =>
                  errorHandler(e, async ({ code, error }) => {
                    await sendWsMessage({
                      type: 'RESPONSE',
                      target: message.target,
                      success: false,
                      code,
                      error,
                    });
                  })
                );
            }
          }
        } catch (e) {
          logger.warn(e, 'error on WS message');
        }
      });

      ws.on('message', handleFirstRequest);
    }
  };

export const isWsEnabled = () => {
  const sid = session.get('websocketSid');
  return sid !== undefined;
};

const getWsSession = async (): Promise<WebSocket & WsAckNonce> => {
  // recover ws sid from the session
  const sid = session.get('websocketSid');
  logger.trace({ sid }, 'getWsSession');
  if (!wsSessions[sid]) {
    throw Error('WS session does not exist');
  }
  if (!wsSessions[sid].ws) {
    throw Error('WS is currently disconnected');
  }
  return wsSessions[sid].ws;
};

type MayBeUndefined<T> = T extends undefined ? undefined : T;

/**
 * send message through a websocket and wait for response
 */
export async function sendWsMessage<
  M extends WsMessage = undefined,
  R = undefined,
>(
  /**
   * object to send (must be JSON serializable)
   */
  message: M,
  {
    responseValidator,
    timeout = 30_000, // TODO should it be correlated with heartbeat?
    strict = false,
  }: {
    /**
     * validate/transform incoming data object, must return response or throw
     * default validate message delivery acknowledge
     */
    responseValidator?: (data: object) => R extends undefined ? never : R;
    /**
     * reject after timeout
     */
    timeout?: number;
    /**
     * set true if it should throw on fail
     */
    strict?: boolean;
  } = {},
  {
    tryCount = 0,
  }: {
    /**
     * current retry
     */
    tryCount?: number;
  } = {}
): Promise<MayBeUndefined<R>> {
  const RETRY_DELAY = 5_000; // TODO should it be correlated with heartbeat?
  logger.trace({ tryCount, timeout, strict }, 'sendWsMessage');
  try {
    const response: MayBeUndefined<R> = await new Promise<MayBeUndefined<R>>(
      (resolve, reject) => {
        getWsSession()
          .then((ws) => {
            // send message with unique acknowledge id
            const { ack } = ws;
            ws.ack = ws.ack + 1;
            // ensure rejection after timeout
            const rejectTimeout = setTimeout(() => {
              clean();
              reject(Error('ws send message timeout reached'));
            }, timeout);
            // ensure rejection if socket is closed
            ws.on('close', handleClose);
            // ensure client answer or acknowledge message reception
            ws.on('message', handleMessage);
            ws.send(
              serializeData({ ...message, ack }),
              // rejection when failing to write out message
              (err) => {
                if (err) {
                  clean();
                  reject(err);
                }
              }
            );

            /**
             * call to clean callbacks before resolve of reject
             */
            function clean() {
              clearTimeout(rejectTimeout);
              ws.removeListener('close', handleClose);
              ws.removeListener('message', handleMessage);
            }
            function handleClose() {
              clean();
              reject(Error('ws closed'));
            }
            function validateAck(obj: WsMessage) {
              if ((obj?.type === 'ACK', obj?.ack !== ack))
                throw Error('Not ack');
            }
            function handleMessage(data: RawData) {
              try {
                const dataObj = deserializeData(data);
                logger.trace(dataObj, 'handleMessage');
                const res = responseValidator
                  ? responseValidator(dataObj)
                  : validateAck(dataObj);
                clean();
                resolve(res as MayBeUndefined<R>);
              } catch (e) {
                logger.trace(e, 'handleMessage catch');
                // noop response validation failed
              }
            }
          })
          .catch(reject);
      }
    ).catch((error) => {
      logger.debug(
        { tryCount, error: error?.message },
        'sendWsMessage try fail'
      );
      if (tryCount < 3) {
        return sleep(Math.pow(2, tryCount) * RETRY_DELAY).then(() => {
          return sendWsMessage(
            message,
            {
              responseValidator,
              timeout,
              strict,
            },
            {
              tryCount: tryCount + 1,
            }
          );
        });
      }
      throw error;
    });
    logger.debug({ response, tryCount }, 'sendWsMessage response');
    return response;
  } catch (error) {
    logger.warn({ tryCount, timeout, error, strict }, 'sendWsMessage fail');
    if (strict) {
      throw error;
    }
  }
}
