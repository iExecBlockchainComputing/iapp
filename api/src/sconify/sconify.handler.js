import { z } from 'zod';
import { ethereumAddressZodSchema } from '../utils/ethereumAddressZodSchema.js';
import { logger } from '../utils/logger.js';
import { cleanLocalDocker } from '../utils/saveDockerSpace.js';
import { sconify } from './sconify.service.js';
import { fromError, createMessageBuilder } from 'zod-validation-error';

const bodySchema = z.object({
  yourWalletPublicAddress: ethereumAddressZodSchema,
  dockerhubImageToSconify: z
    .string()
    .min(
      1,
      'A dockerhub image is required. <dockerhubUsername>/<iAppName>:<version>'
    ),
  dockerhubPushToken: z
    .string()
    .min(
      1,
      'An auth token with push access to dockerhub repository is required.'
    ),
});

export async function sconifyHandler(req, res) {
  let yourWalletPublicAddress;
  let dockerhubImageToSconify;
  let dockerhubPushToken;
  try {
    const requestBody = bodySchema.parse(req.body || {});
    yourWalletPublicAddress = requestBody.yourWalletPublicAddress;
    dockerhubImageToSconify = requestBody.dockerhubImageToSconify;
    dockerhubPushToken = requestBody.dockerhubPushToken;
  } catch (error) {
    throw fromError(error, {
      messageBuilder: createMessageBuilder({
        prefix: 'Invalid request body',
      }),
    });
  }

  try {
    const { sconifiedImage, appContractAddress } = await sconify({
      dockerImageToSconify: dockerhubImageToSconify,
      pushToken: dockerhubPushToken,
      userWalletPublicAddress: yourWalletPublicAddress,
    });
    res.status(200).json({
      success: true,
      sconifiedImage,
      appContractAddress,
    });
  } finally {
    // best effort clean images
    cleanLocalDocker({
      dockerhubImageToSconify,
    })
      .then(() => {
        logger.info('End of cleanLocalDocker()');
      })
      .catch((error) => {
        logger.warn({ error }, 'Failed to clean local docker');
      });
  }
}
