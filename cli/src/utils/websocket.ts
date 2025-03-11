import WebSocket, { RawData } from 'ws';
import { pack, unpack } from 'msgpackr';
import { debug } from './debug.js';
import { sleep } from './sleep.js';
import {
  WS_RECONNECTION_DELAY,
  WS_RECONNECTION_MAX_ATTEMPTS,
  WS_SERVER_HEARTBEAT_INTERVAL,
} from '../config/config.js';

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
export function serializeData<T extends WsMessage>(data: T) {
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

export function createReconnectingWs(
  host: string,
  options: {
    /**
     * use to register event listeners
     */
    connectCallback?: (ws: WebSocket) => void;
    /**
     * use to perform operation that must be done only once when the session is established
     */
    initCallback?: (ws: WebSocket) => void;
    /**
     * called when session with server is definitely broken
     */
    errorCallback?: (err: Error) => void;
  } = {},
  internal: {
    /**
     * internal websocket session id
     */
    sid?: string;
    /**
     * internal reconnection try count
     */
    tryCount?: number;
  } = {}
) {
  let { sid, tryCount = 0 } = internal;
  const {
    connectCallback = () => {},
    initCallback = () => {},
    errorCallback = () => {},
  } = options;

  const ws: WebSocket & { pingTimeout?: NodeJS.Timeout } = new WebSocket(
    host,
    sid
  );

  /**
   * clean close ws procedure
   */
  const teardown = () => {
    debug('ws teardown');
    ws.removeAllListeners();
    ws.terminate();
    if (ws.pingTimeout) {
      clearTimeout(ws.pingTimeout);
    }
  };

  // setup acknowledge messages mechanism
  ws.on('message', (data) => {
    try {
      const { ack, type } = deserializeData<WsMessage & { ack?: unknown }>(
        data
      );
      if (ack !== undefined && type !== 'ACK') {
        ws.send(serializeData({ type: 'ACK', ack }));
        debug(`acknowledge ws message ${ack}`);
      }
    } catch {
      // noop
    }
  });

  // create or recover WS session
  ws.once('message', (data) => {
    const message = deserializeData<WsMessage & { sid?: string }>(data);
    debug(`ws message once: ${JSON.stringify(message, undefined, 2)}`);

    if (message.type === 'RECOVERED_SESSION') {
      connectCallback(ws);
    } else if (message.type === 'NEW_SESSION' && message.sid) {
      if (sid) {
        teardown();
        return errorCallback(Error('Failed to recover session with server'));
      }
      sid = message.sid;
      connectCallback(ws);
      initCallback(ws);
    } else {
      teardown();
      return errorCallback(Error('Failed to establish session with server'));
    }
  });

  // ensure ws liveness (reset heartbeat on ping)
  const heartbeat = () => {
    clearTimeout(ws.pingTimeout);
    ws.pingTimeout = setTimeout(() => {
      debug('ws heartbeat fail');
      teardown();
      reconnect();
    }, 1.5 * WS_SERVER_HEARTBEAT_INTERVAL);
  };
  const ping = () => {
    debug('ws ping');
    heartbeat();
  };
  ws.on('ping', ping)
    .on('open', ping)
    .on('close', () => {
      clearTimeout(ws.pingTimeout);
    });

  /**
   * try reconnecting to ws session
   */
  const reconnect = async () => {
    debug('ws try reconnect');
    if (tryCount >= WS_RECONNECTION_MAX_ATTEMPTS) {
      return errorCallback(Error('Reconnection to server failed'));
    }
    // first reconnect attempt occurs immediately
    if (tryCount > 0) {
      await sleep(WS_RECONNECTION_DELAY);
    }
    createReconnectingWs(
      host,
      {
        connectCallback,
        initCallback,
        errorCallback,
      },
      { sid, tryCount: tryCount + 1 }
    );
  };

  // reset retry count when connection is established properly
  ws.on('open', () => {
    tryCount = 0;
  });

  // clean ws and recreate connection on error
  ws.on('error', (err) => {
    debug(`ws error: ${err}`);
    teardown();
    reconnect();
  });

  // clean ws and recreate connection on unexpected close
  ws.on('close', (code) => {
    debug(`ws close: ${code}`);
    if (code !== 1000) {
      reconnect();
    }
  });
}
