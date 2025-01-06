import { SCONE_NODE_IMAGE } from '../constants/constants.js';
import { deployAppContractToBellecour } from '../singleFunction/deployAppContractToBellecour.js';
import { getSconifiedImageFingerprint } from '../singleFunction/getSconifiedImageFingerprint.js';
import { inspectImage } from '../singleFunction/inspectImage.js';
import { pullPublicImage } from '../singleFunction/pullPublicImage.js';
import { pullSconeImage } from '../singleFunction/pullSconeImage.js';
import { pushImage } from '../singleFunction/pushImage.js';
import { sconifyImage } from '../singleFunction/sconifyImage.js';
import { parseImagePath } from '../utils/parseImagePath.js';
import { logger } from '../utils/logger.js';

/**
 * Examples of valid dockerImageToSconify:
 * "robiniexec/hello-world:1.0.0"
 *
 * This image needs to be publicly available on Docker Hub.
 * This image needs to be built for linux/amd64 platform. (Use buildx on MacOS)
 */
export async function sconify({
  dockerImageToSconify,
  userWalletPublicAddress,
  pushToken, // auth token with push access, TTL 5 min may be an issue if sconification takes too much time
}) {
  logger.info(
    {
      dockerImageToSconify,
      userWalletPublicAddress,
    },
    'New sconify request'
  );

  logger.info(
    { dockerImageToSconify },
    '---------- 1 ---------- Pulling Docker image to sconify...'
  );
  await pullPublicImage(dockerImageToSconify);
  logger.info({ dockerImageToSconify }, 'Docker image pulled.');

  logger.info('---------- 2 ---------- Inspecting Docker image to sconify...');
  const inspectResult = await inspectImage(dockerImageToSconify);
  if (inspectResult.Os !== 'linux' || inspectResult.Architecture !== 'amd64') {
    throw new Error(
      'dockerImageToSconify needs to target linux/amd64 platform.'
    );
  }

  const { dockerUserName, imageName, imageTag } =
    parseImagePath(dockerImageToSconify);
  if (!dockerUserName || !imageName || !imageTag) {
    throw new Error(
      'Invalid dockerImageToSconify. Please provide something that looks like robiniexec/hello-world:1.0.0'
    );
  }

  const targetImageName = imageName;
  const targetImageTag = `${imageTag}-tee-scone-debug`;
  const targetImagePath = `${dockerUserName}/${imageName}:${targetImageTag}`;
  logger.info({ targetImagePath }, 'Target image');

  // Pull the SCONE image
  // https://gitlab.scontain.com/sconecuratedimages/node/container_registry/20
  logger.info('---------- 3 ---------- Pulling Scone image');
  await pullSconeImage(SCONE_NODE_IMAGE);

  logger.info('---------- 4 ---------- Start sconification...');
  await sconifyImage({
    fromImage: dockerImageToSconify,
    toImage: targetImagePath,
    imageName: `tee-scone-${dockerUserName}-${targetImageName}`,
  });
  logger.info('Sconified successfully');

  logger.info('---------- 5 ---------- Pushing image to dockerhub...');
  const { Digest: pushedDockerImageDigest } = await pushImage({
    targetImagePath,
    targetImageTag,
    pushToken,
  });
  const imageOnlyChecksum = pushedDockerImageDigest.split(':')[1];
  logger.info(
    { pushedDockerImageDigest, imageOnlyChecksum },
    'Pushed successfully'
  );

  logger.info('---------- 6 ---------- Getting TEE image fingerprint...');
  const fingerprint = await getSconifiedImageFingerprint({
    targetImagePath,
  });
  logger.info({ sconifiedImageFingerprint: fingerprint });

  logger.info('---------- 7 ---------- Deploying app contract...');
  const { appContractAddress } = await deployAppContractToBellecour({
    userWalletPublicAddress,
    appName: `${dockerUserName}-${targetImageName}-${Date.now().toString()}`,
    dockerImagePath: targetImagePath,
    dockerImageDigest: imageOnlyChecksum,
    fingerprint,
  });
  logger.info('Deployed successfully to bellecour');

  return {
    sconifiedImage: targetImagePath,
    appContractAddress,
  };
}
