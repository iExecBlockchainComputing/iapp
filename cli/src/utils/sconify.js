import { request } from 'undici';
import { addDeploymentData } from './cacheExecutions.js';
import { SCONIFY_API_URL } from '../config/config.js';
import { getAuthToken } from '../utils/dockerhub.js';

export async function sconify({
  sconifyForProd,
  iAppNameToSconify,
  walletAddress,
  dockerhubAccessToken,
  dockerhubUsername,
}) {
  if (sconifyForProd) {
    throw Error('This feature is not yet implemented. Coming soon ...');
  }

  let teeDockerhubImagePath;
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

    const { body } = await request(`${SCONIFY_API_URL}/sconify`, {
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
      throwOnError: true,
    });

    // Extract necessary information
    const json = await body.json();
    sconifiedImage = json.sconifiedImage;
    appContractAddress = json.appContractAddress;
    teeDockerhubImagePath = json.sconifiedImage.split(':')[0];
  } catch (err) {
    let reason;
    if (err.body) {
      reason = err.body;
    } else if (
      err?.code === 'ECONNREFUSED' ||
      err?.code === 'UND_ERR_CONNECT_TIMEOUT'
    ) {
      reason = "Can't reach TEE transformation server!";
    } else {
      reason = err.toString();
    }
    throw Error(`Failed to transform your app into a TEE app: ${reason}`);
  }

  // Add deployment data to deployments.json
  await addDeploymentData({
    sconifiedImage,
    appContractAddress,
    owner: walletAddress,
  });

  return {
    sconifiedImage,
    dockerHubUrl: `https://hub.docker.com/r/${teeDockerhubImagePath}/tags`,
    appContractAddress,
  };
}
