import {
  SCONIFY_IMAGE_VERSIONS,
  TEMPLATE_CONFIG,
  type TemplateName,
} from '../constants/constants.js';
import { checkPushToken } from '../singleFunction/checkPushToken.js';
import { deployAppContractToBellecour } from '../singleFunction/deployAppContractToBellecour.js';
import { getSconifiedImageFingerprint } from '../singleFunction/getSconifiedImageFingerprint.js';
import { inspectImage } from '../singleFunction/inspectImage.js';
import { pullPublicImage } from '../singleFunction/pullPublicImage.js';
import { pullSconeImage } from '../singleFunction/pullSconeImage.js';
import { pushImage } from '../singleFunction/pushImage.js';
import { removeImage } from '../singleFunction/removeImage.js';
import { sconifyImage } from '../singleFunction/sconifyImage.js';
import { ForbiddenError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { parseImagePath } from '../utils/parseImagePath.js';
import { isWsEnabled, sendWsMessage } from '../utils/websocket.js';

export async function deprecated_sconify({
  dockerImageToSconify,
  userWalletPublicAddress,
  pushToken,
  templateLanguage,
}: {
  /**
   * Examples of valid dockerImageToSconify:
   * "robiniexec/hello-world:1.0.0"
   *
   * This image needs to be publicly available on Docker Hub.
   * This image needs to be built for linux/amd64 platform. (Use buildx on MacOS)
   */
  dockerImageToSconify: string;
  userWalletPublicAddress: string;
  /**
   * auth token with push access, TTL 5 min may be an issue if sconification takes too much time
   */
  pushToken: string;
  templateLanguage: TemplateName;
}): Promise<{
  sconifiedImage: string;
  appContractAddress: string;
}> {
  // deprecated service fixed in scone v5.7
  const sconifyVersion = SCONIFY_IMAGE_VERSIONS['v5'];

  let currentPushToken = pushToken;
  const wsEnabled = isWsEnabled();

  logger.info(
    {
      dockerImageToSconify,
      userWalletPublicAddress,
      wsEnabled,
    },
    'New sconify request'
  );

  //Get config for the template
  const configTemplate = TEMPLATE_CONFIG[templateLanguage];

  const { dockerUserName, imageName, imageTag } =
    parseImagePath(dockerImageToSconify);
  if (!dockerUserName || !imageName || !imageTag) {
    // this should no happen since image is validated by regexp
    throw new Error(`Unable to parse image name ${dockerImageToSconify}`);
  }

  logger.info(
    { configTemplate },
    '---------- 0 ---------- Template Configuration...'
  );

  logger.info(
    { dockerImageToSconify },
    '---------- 1 ---------- Checking Dockerhub push access...'
  );

  await checkPushToken({
    pushToken: currentPushToken,
    repository: `${dockerUserName}/${imageName}`,
  }).catch((e) => {
    throw new ForbiddenError(
      `Invalid push token, make sure to provide a token with push access on ${dockerUserName}/${imageName}`,
      { cause: e }
    );
  });
  logger.info(
    { dockerImageToSconify },
    '---------- 2 ---------- Pulling Docker image to sconify...'
  );
  await pullPublicImage(dockerImageToSconify).catch((err) => {
    throw new ForbiddenError(
      `Cannot pull image, ensure ${dockerImageToSconify} is a public image on hub.docker.com`,
      { cause: err }
    );
  });
  logger.info({ dockerImageToSconify }, 'Docker image pulled.');

  let sconifiedImageId;
  let appEntrypoint;
  try {
    logger.info(
      '---------- 3 ---------- Inspecting Docker image to sconify...'
    );
    const inspectResult = await inspectImage(dockerImageToSconify);
    if (
      inspectResult.Os !== 'linux' ||
      inspectResult.Architecture !== 'amd64'
    ) {
      throw new ForbiddenError(
        `Invalid image platform, ${dockerImageToSconify} has no linux/amd64 platform variant`
      );
    }

    appEntrypoint = Array.isArray(inspectResult.Config.Entrypoint)
      ? inspectResult.Config.Entrypoint.join(' ')
      : inspectResult.Config.Entrypoint;

    if (!appEntrypoint) {
      throw new ForbiddenError(`Can't read entrypoint from docker image`);
    }
    logger.info({ appEntrypoint }, 'Entrypoint read from image.');

    logger.info('---------- 4 ---------- Ensure Scone curated image');
    if (configTemplate.sconeCuratedImage) {
      await pullSconeImage(configTemplate.sconeCuratedImage);
    }

    logger.info('---------- 5 ---------- Start sconification...');
    sconifiedImageId = await sconifyImage({
      fromImage: dockerImageToSconify,
      sconifyVersion,
      binary: configTemplate.binary,
    });
    logger.info({ sconifiedImageId }, 'Sconified successfully');
  } finally {
    logger.info(
      { imageId: dockerImageToSconify },
      'Removing docker image to sconify'
    );
    // clean the image to sconify as soon as it is sconified or an error occurs
    // non blocking for user
    removeImage({ imageId: dockerImageToSconify })
      .then(() => {
        logger.info(
          { imageId: dockerImageToSconify },
          'Removed docker image to sconify'
        );
      })
      .catch((error) => {
        logger.warn(
          { error, dockerImageToSconify },
          `Failed to remove docker image to sconify`
        );
      });
  }

  const imageRepo = `${dockerUserName}/${imageName}`;
  const sconifiedImageShortId = sconifiedImageId.substring(7, 7 + 12); // extract 12 first chars after the leading "sha256:"
  const sconifiedImageTag = `${imageTag}-tee-scone-${sconifyVersion}-debug-${sconifiedImageShortId}`; // add digest in tag to avoid replacing previous build
  const sconifiedImage = `${imageRepo}:${sconifiedImageTag}`;

  let pushed;
  let fingerprint;
  try {
    logger.info('---------- 6 ---------- Pushing image to user dockerhub...');

    if (wsEnabled) {
      logger.info('Ask for renew dockerhubPushToken');
      const { dockerhubPushToken: renewedPushToken } = await sendWsMessage(
        {
          type: 'REQUEST',
          target: 'RENEW_PUSH_TOKEN',
        },
        {
          responseValidator: (obj: {
            result?: { dockerhubPushToken?: string };
          }) => {
            if (typeof obj?.result?.dockerhubPushToken !== 'string') {
              throw Error('Invalid response');
            }
            return obj.result as { dockerhubPushToken: string };
          },
        }
      );
      logger.info('dockerhubPushToken renewed');
      currentPushToken = renewedPushToken;
    }

    pushed = await pushImage({
      image: sconifiedImageId,
      repo: imageRepo,
      tag: sconifiedImageTag,
      pushToken: currentPushToken,
    });
    logger.info(pushed, 'Pushed image');

    logger.info('---------- 7 ---------- Getting TEE image fingerprint...');
    fingerprint = await getSconifiedImageFingerprint(sconifiedImageId);
    logger.info({ sconifiedImageFingerprint: fingerprint });
  } finally {
    logger.info(
      { imageId: sconifiedImageId },
      'Removing sconified docker image'
    );
    // clean the sconified image as soon as it is pushed or an error occurs
    // non blocking for user
    // force to clean all tags
    removeImage({ imageId: sconifiedImageId, force: true })
      .then(() => {
        logger.info(
          { imageId: dockerImageToSconify },
          'Removed sconified docker image'
        );
      })
      .catch((error) => {
        logger.warn(
          { error, sconifiedImageId },
          `Failed to remove sconified docker image`
        );
      });
  }

  logger.info('---------- 8 ---------- Deploying app contract...');
  const pushedImageDigest = pushed.Digest.split(':')[1]; // remove leading 'sha256:
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
