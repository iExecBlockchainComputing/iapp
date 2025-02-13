import WebSocket from 'ws';
import { deserializeData, serializeData } from './websocket.js';
import { addDeploymentData } from './cacheExecutions.js';
import { SCONIFY_API_URL, SCONIFY_API_WS_URL } from '../config/config.js';
import { getAuthToken } from '../utils/dockerhub.js';
import { sleep } from './sleep.js';

const INITIAL_RETRY_PERIOD = 20 * 1000; // 20s

class TooManyRequestsError extends Error {}

export async function sconify({
  iAppNameToSconify,
  template,
  walletAddress,
  dockerhubAccessToken,
  dockerhubUsername,
  tryCount = 0,
}) {
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

    // const jsonResponse = await fetch(`${SCONIFY_API_URL}/sconify`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'x-wallet': walletAddress,
    //   },
    //   body: JSON.stringify({
    //     template,
    //     dockerhubImageToSconify: iAppNameToSconify,
    //     dockerhubPushToken: pushToken, // used for pushing sconified image on user repo
    //     yourWalletPublicAddress: walletAddress,
    //   }),
    // })
    //   .catch(() => {
    //     throw Error("Can't reach TEE transformation server!");
    //   })
    //   .then((res) => {
    //     if (res.ok) {
    //       return res.json().catch(() => {
    //         // failed to parse body
    //         throw Error('Unexpected server response');
    //       });
    //     }
    //     if (res.status === 429) {
    //       throw new TooManyRequestsError(
    //         'TEE transformation server is busy, retry later'
    //       );
    //     }
    //     // try getting error message from json body
    //     return res
    //       .json()
    //       .catch(() => {
    //         // failed to parse body
    //         throw Error('Unknown server error');
    //       })
    //       .then(({ error }) => {
    //         throw Error(error || 'Unknown server error');
    //       });
    //   });

    const jsonResponse = await new Promise((resolve, reject) => {
      const ws = new WebSocket(`${SCONIFY_API_WS_URL}/ws/sconify`);
      ws.on('open', () => {
        ws.send(
          serializeData({
            template,
            dockerhubImageToSconify: iAppNameToSconify,
            dockerhubPushToken: pushToken,
            yourWalletPublicAddress: walletAddress,
          })
        );
      });
      ws.on('close', () =>
        reject(Error('Connection with TEE transformation server interrupted'))
      );
      ws.on('message', (data) => {
        let json;
        // handle errors
        try {
          json = deserializeData(data);
        } catch (e) {
          reject(e);
        }
        if (json?.error) {
          reject(Error(json.error));
        }
        // handle server requests
        if (json?.action === 'RENEW_PUSH_TOKEN') {
          getPushToken()
            .then((renewedPushToken) => {
              ws.send(
                serializeData({
                  dockerhubPushToken: renewedPushToken,
                })
              );
            })
            .catch(reject);
        }
        // handle final response
        if (json?.appContractAddress && json?.sconifiedImage) {
          resolve(json);
        }
      });
    });

    // Extract necessary information
    if (!jsonResponse.appContractAddress) {
      throw Error('Unexpected server response: missing appContractAddress');
    }
    if (!jsonResponse.sconifiedImage) {
      throw Error('Unexpected server response: missing sconifiedImage');
    }
    appContractAddress = jsonResponse.appContractAddress;
    sconifiedImage = jsonResponse.sconifiedImage;
  } catch (err) {
    // retry with exponential backoff
    if (err instanceof TooManyRequestsError && tryCount < 3) {
      await sleep(INITIAL_RETRY_PERIOD * Math.pow(2, tryCount));
      return sconify({
        iAppNameToSconify,
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
