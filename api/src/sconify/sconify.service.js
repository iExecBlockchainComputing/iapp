import {
  SCONE_NODE_IMAGE,
  SCONIFY_IMAGE_VERSION,
} from '../constants/constants.js';
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

  const appEntrypoint = 'node /app/src/app.js'; // TODO make it a parameter to allow custom entrypoint

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

  // Pull the SCONE image
  logger.info('---------- 3 ---------- Pulling Scone image');
  await pullSconeImage(SCONE_NODE_IMAGE);

  logger.info('---------- 4 ---------- Start sconification...');
  const sconifiedImageId = await sconifyImage({
    fromImage: dockerImageToSconify,
  });

  logger.info({ sconifiedImageId }, 'Sconified successfully');

  logger.info('---------- 5 ---------- Pushing image to user dockerhub...');

  const imageRepo = `${dockerUserName}/${imageName}`;
  const sconifiedImageShortId = sconifiedImageId.substring(7, 7 + 12); // extract 12 first chars after the leading "sha256:"
  const sconifiedImageTag = `${imageTag}-tee-scone-${SCONIFY_IMAGE_VERSION}-debug-${sconifiedImageShortId}`; // add digest in tag to avoid replacing previous build
  const sconifiedImage = `${imageRepo}:${sconifiedImageTag}`;

  const pushed = await pushImage({
    image: sconifiedImageId,
    repo: imageRepo,
    tag: sconifiedImageTag,
    pushToken,
  });

  const pushedImageDigest = pushed.Digest.split(':')[1]; // remove leading 'sha256:
  logger.info(pushed, 'Pushed image');

  logger.info('---------- 6 ---------- Getting TEE image fingerprint...');
  const fingerprint = await getSconifiedImageFingerprint({
    image: sconifiedImageId,
  });
  logger.info({ sconifiedImageFingerprint: fingerprint });

  logger.info('---------- 7 ---------- Deploying app contract...');
  const { appContractAddress } = await deployAppContractToBellecour({
    userWalletPublicAddress,
    appName: `${imageName}-${imageTag}`,
    dockerImage: sconifiedImage,
    dockerImageDigest: pushedImageDigest,
    fingerprint,
    entrypoint: appEntrypoint,
  });
  logger.info('Deployed successfully to bellecour');

  return {
    sconifiedImage,
    appContractAddress,
  };
}
