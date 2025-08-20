import { z } from 'zod';
import { createMessageBuilder, fromError } from 'zod-validation-error';
import { TEMPLATE_CONFIG, type TemplateName } from '../constants/constants.js';
import { ethereumAddressZodSchema } from '../utils/ethereumAddressZodSchema.js';
import { deprecated_sconify } from './deprecated_sconify.service.js';
import type { Request, Response } from 'express';
import { logger } from '../utils/logger.js';

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
  template: z
    .enum(Object.keys(TEMPLATE_CONFIG) as [TemplateName])
    .default('JavaScript'),
});

async function deprecated_handleSconifyRequest(requestObj: object) {
  let yourWalletPublicAddress;
  let dockerhubImageToSconify;
  let dockerhubPushToken;
  let template: TemplateName;
  try {
    ({
      yourWalletPublicAddress,
      dockerhubImageToSconify,
      dockerhubPushToken,
      template,
    } = bodySchema.parse(requestObj));
  } catch (error) {
    throw fromError(error, {
      messageBuilder: createMessageBuilder({
        prefix: 'Invalid request body',
      }),
    });
  }
  const { sconifiedImage, appContractAddress } = await deprecated_sconify({
    dockerImageToSconify: dockerhubImageToSconify,
    pushToken: dockerhubPushToken,
    userWalletPublicAddress: yourWalletPublicAddress,
    templateLanguage: template,
  });
  return { sconifiedImage, appContractAddress };
}

export async function deprecated_sconifyWsHandler(message: object) {
  logger.warn('deprecated feature hit: ws request SCONIFY');
  const { sconifiedImage, appContractAddress } =
    await deprecated_handleSconifyRequest(message);
  return { sconifiedImage, appContractAddress };
}

export async function deprecated_sconifyHttpHandler(
  req: Request,
  res: Response
) {
  logger.warn('deprecated feature hit: POST /sconify');
  const { sconifiedImage, appContractAddress } =
    await deprecated_handleSconifyRequest(req.body || {});
  res.status(200).json({
    success: true,
    sconifiedImage,
    appContractAddress,
  });
}
