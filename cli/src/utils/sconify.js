import { addDeploymentData } from './cacheExecutions.js';
import { SCONIFY_API_URL } from '../config/config.js';
import { getAuthToken } from '../utils/dockerhub.js';

export async function sconify({
  iAppNameToSconify,
  walletAddress,
  dockerhubAccessToken,
  dockerhubUsername,
}) {
  let appContractAddress;
  let sconifiedImage;
  try {
    const [dockerRepository] = iAppNameToSconify.split(':');

    const pushToken = await getAuthToken({
      repository: dockerRepository,
      action: 'pull,push',
      dockerhubAccessToken,
      dockerhubUsername,
    });

    const jsonResponse = await fetch(`${SCONIFY_API_URL}/sconify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet': walletAddress,
      },
      body: JSON.stringify({
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
