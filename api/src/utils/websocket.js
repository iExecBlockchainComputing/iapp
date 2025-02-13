import { ZodSchema } from 'zod';

/**
 * @typedef {import('ws').WebSocket} WebSocket
 * @typedef {import('ws').RawData} RawData
 */

/**
 * wait for the next incoming message through a websocket
 * @param {WebSocket} ws
 * @param {Object} options
 * @param {ZodSchema} options.schema validate massage against a schema
 * @param {number} options.timeout reject after timeout
 * @returns
 */
export async function waitForMessage(ws, { schema, timeout } = {}) {
  // TODO implement timeout
  const messagePromise = new Promise((resolve, reject) => {
    ws.once('message', (data) => {
      try {
        let payload = deserializeData(data);
        if (schema && schema instanceof ZodSchema) {
          payload = schema.parse(payload || {});
        }
        resolve(payload);
      } catch {
        reject(Error('Invalid payload'));
      }
    });
  });
  return messagePromise;
}

/**
 * serialize data to send through a websocket
 * @param {Object} data
 * @returns
 */
export function serializeData(data) {
  try {
    return Buffer.from(JSON.stringify(data));
  } catch {
    throw Error('Failed to serialize WS data');
  }
}

/**
 * deserialize data received through a websocket
 * @param {RawData} data
 * @returns
 */
export function deserializeData(data) {
  try {
    return JSON.parse(Buffer.from(data).toString());
  } catch {
    throw Error('Failed to deserialize WS data');
  }
}
