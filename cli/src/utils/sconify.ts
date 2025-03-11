import { addDeploymentData } from './cacheExecutions.js';
import { SCONIFY_API_HTTP_URL, SCONIFY_API_WS_URL } from '../config/config.js';
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
  template: string;
  walletAddress: string;
  dockerhubAccessToken: string;
  dockerhubUsername: string;
  tryCount?: number;
}): Promise<{
  sconifiedImage: string;
  appContractAddress: string;
}> {
  let appContractAddress;
  let sconifiedImage;
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

    let sconifyResult: { appContractAddress?: string; sconifiedImage?: string };

    if (process.env.EXPERIMENTAL_WS_API) {
      // experimental ws connection
      sconifyResult = await new Promise((resolve, reject) => {
        createReconnectingWs(SCONIFY_API_WS_URL, {
          headers: {
            'x-wallet': walletAddress,
          },
          connectCallback: (ws) => {
            const handleError = (e: Error) => {
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
                if (message?.target === 'SCONIFY') {
                  ws.close(1000); // normal ws close
                  if (message?.success === true) {
                    resolve(message.result);
                  } else {
                    reject(Error(message.error));
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
                target: 'SCONIFY', // call sconify handler
                template,
                dockerhubImageToSconify: iAppNameToSconify,
                dockerhubPushToken: pushToken,
                yourWalletPublicAddress: walletAddress,
              })
            );
          },
          errorCallback: reject,
        });
      });
    } else {
      // standard http call
      sconifyResult = await fetch(`${SCONIFY_API_HTTP_URL}/sconify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet': walletAddress,
        },
        body: JSON.stringify({
          template,
          dockerhubImageToSconify: iAppNameToSconify,
          dockerhubPushToken: pushToken, // used for pushing sconified image on user repo
          yourWalletPublicAddress: walletAddress,
        }),
      })
        .catch(() => {
          throw Error("Can't reach TEE transformation server!");
        })
        .then((res) => {
          if (res.ok) {
            return res.json().catch(() => {
              // failed to parse body
              throw Error('Unexpected server response');
            });
          }
          if (res.status === 429) {
            throw new TooManyRequestsError(
              'TEE transformation server is busy, retry later'
            );
          }
          // try getting error message from json body
          return res
            .json()
            .catch(() => {
              // failed to parse body
              throw Error('Unknown server error');
            })
            .then(({ error }) => {
              throw Error(error || 'Unknown server error');
            });
        });
    }

    // Extract necessary information
    if (!sconifyResult.appContractAddress) {
      throw Error('Unexpected server response: missing appContractAddress');
    }
    if (!sconifyResult.sconifiedImage) {
      throw Error('Unexpected server response: missing sconifiedImage');
    }
    appContractAddress = sconifyResult.appContractAddress;
    sconifiedImage = sconifyResult.sconifiedImage;
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
    throw Error(`Failed to transform your app into a TEE app: ${err.message}`);
  }

  // Add deployment data to deployments.json
  await addDeploymentData({
    sconifiedImage,
    appContractAddress,
    owner: walletAddress,
  });

  return {
    sconifiedImage,
    appContractAddress,
  };
}
