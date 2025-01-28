import { z } from 'zod';
import { ethereumAddressZodSchema } from '../utils/ethereumAddressZodSchema.js';
import { sconify } from './sconify.service.js';
import { fromError, createMessageBuilder } from 'zod-validation-error';

const bodySchema = z.object({
  yourWalletPublicAddress: ethereumAddressZodSchema,
  dockerhubImageToSconify: z
    .string()
    // dockerhub user name is 4 chars letters and digit only
    .regex(
      /^(?<username>([a-zA-Z0-9]{4,30}))\/(?<repo>[a-z0-9-]+):(?<tag>[\w][\w.-]{0,127})$/,
      'A dockerhub image is required. <dockerhubUsername>/<repo>:<tag>'
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
    ({ yourWalletPublicAddress, dockerhubImageToSconify, dockerhubPushToken } =
      bodySchema.parse(req.body || {}));
  } catch (error) {
    throw fromError(error, {
      messageBuilder: createMessageBuilder({
        prefix: 'Invalid request body',
      }),
    });
  }
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
}
