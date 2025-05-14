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
});

async function handleSconifyRequest(requestObj: object) {
  let yourWalletPublicAddress: string;
  let dockerhubImageToSconify: string;
  let dockerhubPushToken: string;
  let sconeVersion: SconeVersion;
  let template: TemplateName;
  try {
    ({
      yourWalletPublicAddress,
      dockerhubImageToSconify,
      dockerhubPushToken,
      sconeVersion,
      template,
    } = bodySchema.parse(requestObj));
  } catch (error) {
    throw fromError(error, {
      messageBuilder: createMessageBuilder({
        prefix: 'Invalid request body',
      }),
    });
  }
  const { dockerImage, dockerImageDigest, fingerprint, entrypoint } =
    await sconify({
      dockerImageToSconify: dockerhubImageToSconify,
      pushToken: dockerhubPushToken,
      userWalletPublicAddress: yourWalletPublicAddress,
      sconeVersion,
      templateLanguage: template,
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

export async function sconifyBuildHttpHandler(req: Request, res: Response) {
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
