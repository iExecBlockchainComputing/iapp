import { readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { fromError } from 'zod-validation-error';
import {
  CHAINS_CONFIGURATIONS,
  CONFIG_FILE,
  DEFAULT_CHAIN,
  SUPPORTED_CHAINS,
  TEMPLATE_LANGUAGES,
} from '../config/config.js';

type IAppConfig = {
  defaultChain: string;
  projectName?: string;
  template?: string;
  dockerhubUsername?: string;
  dockerhubAccessToken?: string;
  walletAddress?: string;
  walletPrivateKey?: string;
  appSecret?: string | null;
};

const chainNameSchema = z.enum(SUPPORTED_CHAINS as [string, ...[string]]);

export const projectNameSchema = z
  .string()
  .min(2, 'Must contain at least 2 characters') // docker image name constraint
  .refine(
    (value) => !/(^\s)|(\s$)/.test(value),
    'Should not start or end with space'
  )
  .refine(
    (value) => /^[a-zA-Z0-9- ]+$/.test(value ?? ''),
    'Only letters, numbers, spaces, and hyphens are allowed'
  );

const dockerImageNameSchema = z
  .string()
  .refine(
    (value) => /^[a-z0-9-]+$/.test(value ?? ''),
    'Invalid docker image name'
  );

const jsonConfigFileSchema = z.object({
  defaultChain: chainNameSchema.default(DEFAULT_CHAIN),
  projectName: projectNameSchema,
  template: z
    .enum(
      Object.values(TEMPLATE_LANGUAGES).map((value) => value) as [
        string,
        ...[string],
      ]
    )
    .default(TEMPLATE_LANGUAGES.JS),
  dockerhubUsername: z.string().optional(),
  dockerhubAccessToken: z.string().optional(),
  walletAddress: z.string().optional(),
  walletPrivateKey: z.string().optional(),
  appSecret: z.string().optional().nullable(), // can be null or string (null means do no use secret)
});

// transform the projectName into a suitable docker image name (no space, lowercase only)
export function projectNameToImageName(projectName = '') {
  const imageName = projectName.toLowerCase().replaceAll(' ', '-');
  return dockerImageNameSchema.parse(imageName);
}

// Read JSON configuration file
export async function readIAppConfig(): Promise<IAppConfig> {
  const configContent = await readFile(CONFIG_FILE, 'utf8').catch(() => {
    throw Error(
      `Failed to read \`${CONFIG_FILE}\` file. Are you in your iApp project folder?`
    );
  });

  let configAsObject;
  try {
    configAsObject = JSON.parse(configContent);
  } catch {
    throw Error(
      `Failed to read \`${CONFIG_FILE}\` file, JSON seems to be invalid.`
    );
  }
  try {
    return jsonConfigFileSchema.parse(configAsObject);
  } catch (err) {
    const validationError = fromError(err);
    const errorMessage = `Failed to read \`${CONFIG_FILE}\` file: ${validationError.toString()}`;
    throw Error(errorMessage);
  }
}

// Utility function to write the iApp JSON configuration file
export async function writeIAppConfig(config: IAppConfig) {
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function getChainConfig(name: string) {
  const conf = CHAINS_CONFIGURATIONS[name];
  if (!conf) {
    throw Error(`Unsupported chain ${name}`);
  }
  return conf;
}
