import { z } from 'zod';
import { createMessageBuilder, fromError } from 'zod-validation-error';
import { TEMPLATE_CONFIG, type TemplateName } from '../constants/constants.js';
import { ethereumAddressZodSchema } from '../utils/ethereumAddressZodSchema.js';
import { sconify } from './sconify.service.js';
import type { Request, Response } from 'express';

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
    .enum(
      Object.values(TEMPLATE_CONFIG).map((config) => config.template) as [
        TemplateName,
      ]
    )
    .default(TEMPLATE_CONFIG.JavaScript.template),
});

async function handleSconifyRequest(requestObj: object) {
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
  const { sconifiedImage, appContractAddress } = await sconify({
    dockerImageToSconify: dockerhubImageToSconify,
    pushToken: dockerhubPushToken,
    userWalletPublicAddress: yourWalletPublicAddress,
    templateLanguage: template,
  });
  return { sconifiedImage, appContractAddress };
}

export async function sconifyWsHandler(message: object) {
  const { sconifiedImage, appContractAddress } =
    await handleSconifyRequest(message);
  return { sconifiedImage, appContractAddress };
}

export async function sconifyHttpHandler(req: Request, res: Response) {
  const { sconifiedImage, appContractAddress } = await handleSconifyRequest(
    req.body || {}
  );
  res.status(200).json({
    success: true,
    sconifiedImage,
    appContractAddress,
  });
}
