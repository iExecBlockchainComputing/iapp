/**
 * @typedef {import('ws').RawData} RawData
 */

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
