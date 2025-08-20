import { DEFAULT_SCONE_VERSION, SCONIFY_API_WS_URL } from '../config/config.js';
import { getAuthToken } from './dockerhub.js';
import { sleep } from './sleep.js';
import {
  createReconnectingWs,
  deserializeData,
  serializeData,
} from './websocket.js';
import { debug } from './debug.js';

const INITIAL_RETRY_PERIOD = 20 * 1000; // 20s

class TooManyRequestsError extends Error {}

export async function sconify({
  iAppNameToSconify,
  template,
  walletAddress,
  dockerhubAccessToken,
  dockerhubUsername,
  tryCount = 0,
}: {
  iAppNameToSconify: string;
  template?: string;
  walletAddress: string;
  dockerhubAccessToken: string;
  dockerhubUsername: string;
  tryCount?: number;
}): Promise<{
  dockerImage: string;
  dockerImageDigest: string;
  sconeVersion: string;
  fingerprint: string;
  entrypoint: string;
}> {
  let dockerImage;
  let dockerImageDigest;
  let sconeVersion;
  let entrypoint;
  let fingerprint;
  try {
    const [dockerRepository] = iAppNameToSconify.split(':');

    const getPushToken = async () =>
      getAuthToken({
        repository: dockerRepository,
        action: 'pull,push',
        dockerhubAccessToken,
        dockerhubUsername,
      });

    const pushToken = await getPushToken();

    const sconifyResult: {
      dockerImage?: string;
      dockerImageDigest?: string;
      entrypoint?: string;
      fingerprint?: string;
      sconeVersion?: string;
    } = await new Promise((resolve, reject) => {
      createReconnectingWs(SCONIFY_API_WS_URL, {
        headers: {
          'x-wallet': walletAddress,
        },
        connectCallback: (ws) => {
          const handleError = (e: unknown) => {
            ws.close(1000); // normal ws close
            reject(e);
          };

          ws.on('message', (data) => {
            let message;
            // handle communication errors
            try {
              message = deserializeData(data);
              debug(`ws message: ${JSON.stringify(message, undefined, 2)}`);
            } catch (e) {
              handleError(e);
            }

            // handle server responses
            if (message?.type === 'RESPONSE') {
              if (message?.target === 'SCONIFY_BUILD') {
                ws.close(1000); // normal ws close
                if (message?.success === true && message.result) {
                  resolve(message.result);
                } else {
                  reject(Error(message.error || 'Server unknown error'));
                }
              }
            }

            // handle server requests
            if (message?.type === 'REQUEST') {
              if (message?.target === 'RENEW_PUSH_TOKEN') {
                getPushToken()
                  .then((renewedPushToken) => {
                    ws.send(
                      serializeData({
                        type: 'RESPONSE',
                        target: 'RENEW_PUSH_TOKEN',
                        result: {
                          dockerhubPushToken: renewedPushToken,
                        },
                      })
                    );
                  })
                  .catch(handleError);
              }
            }

            // handle server info
            if (message?.type === 'INFO') {
              // TODO server feedback
            }
          });
        },
        initCallback: (ws) => {
          ws.send(
            serializeData({
              type: 'REQUEST',
              target: 'SCONIFY_BUILD', // call sconify handler
              template,
              dockerhubImageToSconify: iAppNameToSconify,
              dockerhubPushToken: pushToken,
              yourWalletPublicAddress: walletAddress,
              sconeVersion: DEFAULT_SCONE_VERSION,
            })
          );
        },
        errorCallback: reject,
      });
    });

    // Extract necessary information
    if (!sconifyResult.dockerImage) {
      throw Error('Unexpected server response: missing dockerImage');
    }
    if (!sconifyResult.dockerImageDigest) {
      throw Error('Unexpected server response: missing dockerImageDigest');
    }
    if (!sconifyResult.sconeVersion) {
      throw Error('Unexpected server response: missing sconeVersion');
    }
    if (!sconifyResult.entrypoint) {
      throw Error('Unexpected server response: missing entrypoint');
    }
    if (!sconifyResult.fingerprint) {
      throw Error('Unexpected server response: missing fingerprint');
    }

    dockerImage = sconifyResult.dockerImage;
    dockerImageDigest = sconifyResult.dockerImageDigest;
    sconeVersion = sconifyResult.sconeVersion;
    entrypoint = sconifyResult.entrypoint;
    fingerprint = sconifyResult.fingerprint;
  } catch (err) {
    debug(`sconify error: ${err}`);
    // retry with exponential backoff
    if (err instanceof TooManyRequestsError && tryCount < 3) {
      const retryAfter = INITIAL_RETRY_PERIOD * Math.pow(2, tryCount);
      debug(
        `server is busy retrying in after ${retryAfter} ms (count: ${tryCount})`
      );
      await sleep(retryAfter);
      return sconify({
        iAppNameToSconify,
        template,
        walletAddress,
        dockerhubAccessToken,
        dockerhubUsername,
        tryCount: tryCount + 1,
      });
    }
    throw Error(
      `Failed to transform your app into a TEE app: ${(err as Error)?.message}`
    );
  }

  return {
    dockerImage,
    dockerImageDigest,
    sconeVersion,
    entrypoint,
    fingerprint,
  };
}
