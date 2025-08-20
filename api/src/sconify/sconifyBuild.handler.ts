import { z } from 'zod';
import { createMessageBuilder, fromError } from 'zod-validation-error';
import {
  SconeVersion,
  TEMPLATE_CONFIG,
  type TemplateName,
} from '../constants/constants.js';
import { ethereumAddressZodSchema } from '../utils/ethereumAddressZodSchema.js';
import { sconify } from './sconifyBuild.service.js';
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
  sconeVersion: z.enum(['v5', 'v5.9']).default('v5'),
  sconeProd: z.boolean().default(false),
});

async function handleSconifyRequest(requestObj: object) {
  let yourWalletPublicAddress: string;
  let dockerhubImageToSconify: string;
  let dockerhubPushToken: string;
  let sconeVersion: SconeVersion;
  let template: TemplateName;
  let sconeProd: boolean;
  try {
    ({
      yourWalletPublicAddress,
      dockerhubImageToSconify,
      dockerhubPushToken,
      sconeVersion,
      template,
      sconeProd,
    } = bodySchema.parse(requestObj));
  } catch (error) {
    throw fromError(error, {
      messageBuilder: createMessageBuilder({
        prefix: 'Invalid request body',
      }),
    });
  }
  if (template === 'Python') {
    logger.warn('Deprecated feature hit: template === "Python"');
  }
  if (sconeVersion === 'v5') {
    logger.warn('Deprecated feature hit: sconeVersion === "v5"');
  }
  if (sconeProd === false) {
    logger.warn('Deprecated feature hit: sconeProd === false');
  }

  const { dockerImage, dockerImageDigest, fingerprint, entrypoint } =
    await sconify({
      dockerImageToSconify: dockerhubImageToSconify,
      pushToken: dockerhubPushToken,
      userWalletPublicAddress: yourWalletPublicAddress,
      sconeVersion,
      templateLanguage: template,
      sconeProd,
    });
  return {
    dockerImage,
    dockerImageDigest,
    fingerprint,
    entrypoint,
    sconeVersion,
  };
}

export async function sconifyBuildWsHandler(message: object) {
  const {
    dockerImage,
    dockerImageDigest,
    fingerprint,
    entrypoint,
    sconeVersion,
  } = await handleSconifyRequest(message);
  return {
    dockerImage,
    dockerImageDigest,
    fingerprint,
    entrypoint,
    sconeVersion,
  };
}

export async function deprecated_sconifyBuildHttpHandler(
  req: Request,
  res: Response
) {
  logger.warn('Deprecated feature hit: POST /sconify/build');
  const {
    dockerImage,
    dockerImageDigest,
    fingerprint,
    entrypoint,
    sconeVersion,
  } = await handleSconifyRequest(req.body || {});
  res.status(200).json({
    success: true,
    dockerImage,
    dockerImageDigest,
    fingerprint,
    entrypoint,
    sconeVersion,
  });
}
