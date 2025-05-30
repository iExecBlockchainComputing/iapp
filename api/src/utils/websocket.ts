import type { IncomingMessage, Server } from 'node:http';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import { type Duplex } from 'node:stream';
import { v4 as uuidv4 } from 'uuid';
import { pack, unpack } from 'msgpackr';
import { bindSession, session } from './requestContext.js';
import { logger } from './logger.js';
import { sleep } from './utils.js';
import { errorHandler } from './errors.js';
import { createRequestId } from './requestId.js';
import {
  WS_HEARTBEAT_INTERVAL,
  WS_SEND_MESSAGE_INITIAL_RETRY_DELAY,
  WS_SEND_MESSAGE_RESPONSE_TIMEOUT,
  WS_SESSION_TIMEOUT,
} from '../constants/constants.js';

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
 * handle message with type REQUEST returns a promise of a response object
 */
export type WebSocketRequestHandler = (message: WsMessage) => Promise<object>;

/**
 * handle message with type REQUEST and return appropriate handler based on the "target" field
 */
export type WebSocketRequestRouter = (
  target?: string
) => WebSocketRequestHandler | void;

/**
 * message acknowledge nonce attached to a WebSocket
 */
type WsAckNonce = { ack?: number };

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
function deserializeData<T extends WsMessage>(data: RawData): T {
  try {
    return unpack(data as Buffer);
  } catch {
    throw Error('Failed to deserialize WS data');
  }
}

const wsSessions: Record<
  string,
  { ws?: WebSocket & WsAckNonce; cleanupTimeout?: NodeJS.Timeout }
> = {};

export const isWsEnabled = () => {
  const sid = session.get('websocketSid');
  return sid !== undefined;
};

/**
 * get the websocket attached to the request session
 */
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

/**
 * send message through the websocket attached to the request session and wait for response
 */
export async function sendWsMessage<M extends WsMessage, R = void>(
  /**
   * object to send (must be JSON serializable)
   */
  message: M,
  {
    responseValidator,
  }: {
    /**
     * validate/transform incoming data object, must return response or throw
     *
     * default: validates message delivery acknowledge
     */
    responseValidator?: (data: object) => R;
  } = {}
): Promise<R> {
  logger.trace({ message }, 'sendWsMessage');

  const retryableSend = async (tryCount = 0): Promise<R> => {
    try {
      const response = await new Promise<R>((resolve, reject) => {
        getWsSession()
          .then((ws) => {
            // send message with unique acknowledge id
            const { ack = 0 } = ws;
            ws.ack = ack + 1;
            // ensure rejection after timeout
            const rejectTimeout = setTimeout(() => {
              clean();
              reject(Error('ws send message timeout reached'));
            }, WS_SEND_MESSAGE_RESPONSE_TIMEOUT);
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
                resolve(res as R);
              } catch (e) {
                logger.trace(e, 'handleMessage catch');
                // noop response validation failed
              }
            }
          })
          .catch(reject);
      }).catch((error) => {
        logger.debug(
          { tryCount, error: error?.message },
          'sendWsMessage try fail'
        );
        if (tryCount < 3) {
          return sleep(
            Math.pow(2, tryCount) * WS_SEND_MESSAGE_INITIAL_RETRY_DELAY
          ).then(() => {
            return retryableSend(tryCount + 1);
          });
        }
        throw error;
      });
      logger.debug({ response, tryCount }, 'sendWsMessage response');
      return response;
    } catch (error) {
      logger.warn({ tryCount, error }, 'sendWsMessage fail');
      throw error;
    }
  };

  return retryableSend();
}

/**
 * attach a WebSocket server to an existing server
 *
 * for each clients, the first message of a session with type REQUEST matching WebSocketRequestHandler is forwarded to this WebSocketRequestHandler
 *
 * the server
 */
export const attachWebSocketServer = ({
  server,
  requestRouter,
}: {
  /**
   * http server
   */
  server: Server;
  /**
   * route requests to the handler based on the "target" field of REQUEST type messages
   */
  requestRouter: WebSocketRequestRouter;
  /**
   *
   */
}) => {
  const wss = new WebSocketServer({ noServer: true });

  // heartbeat to check connection liveness
  type WsLiveCheck = { isAlive?: boolean };
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket & WsLiveCheck) => {
      if (ws.isAlive === false) {
        logger.warn('ws heartbeat failed closing connection');
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, WS_HEARTBEAT_INTERVAL);
  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  /**
   * create the upgrade callback with the following features
   * - heartbeat reset
   * - session creation / reconnection
   * - request routing
   * - response to request
   */
  const createUpgradeCallback =
    ({
      wss,
      socket,
      requestRouter,
    }: {
      wss: WebSocketServer;
      socket: Duplex;
      requestRouter: WebSocketRequestRouter;
    }) =>
    /**
     * upgrade callback
     */
    (ws: WebSocket & WsLiveCheck & WsAckNonce, request: IncomingMessage) => {
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
      session.set('websocketSid', sid);

      // cleanup session on connection close
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
              WS_SESSION_TIMEOUT
            );
          }
        })
      );

      // close connection on error
      ws.on(
        'error',
        // bind session to handler
        bindSession((error) => {
          logger.warn(error, 'ws error');
          ws.close();
        })
      );

      // register request router handler for new session
      if (isNew) {
        // close connection if client does not submit valid request after opening a new session
        const closeIdleConnectionTimeout = setTimeout(() => {
          logger.warn({ sid }, 'Closing idle ws connection');
          ws.close(1000);
        }, 5_000);
        ws.on('close', () => {
          clearTimeout(closeIdleConnectionTimeout);
        });

        const handleFirstRequest = bindSession((data: RawData) => {
          try {
            const message = deserializeData(data);
            if ((message.type === 'REQUEST', message.target)) {
              const requestHandler = requestRouter(message.target);
              if (requestHandler) {
                // request handled, stop listening new requests
                ws.removeListener('message', handleFirstRequest);
                clearTimeout(closeIdleConnectionTimeout);

                logger.info(
                  { sid, target: message.target },
                  'websocket new request'
                );

                (requestHandler as (message: object) => Promise<object>)(
                  message
                )
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
                  )
                  // close connection after the response is received by the client
                  .finally(() => {
                    ws.close(1000);
                    logger.info(
                      { sid, target: message.target },
                      'websocket request treated'
                    );
                  });
              }
            }
          } catch (e) {
            logger.warn(e, 'error on WS message');
          }
        });
        ws.on('message', handleFirstRequest);
      }

      // notify client connection is established
      wss.emit('connection', socket, request);
    };

  server.on('upgrade', (request, socket, head) => {
    createRequestId(() =>
      wss.handleUpgrade(
        request,
        socket,
        head,
        createUpgradeCallback({
          wss,
          socket,
          requestRouter,
        })
      )
    );
  });
};
