import { readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { fromError } from 'zod-validation-error';
import { CONFIG_FILE } from '../config/config.js';

const jsonConfigFileSchema = z.object({
  projectName: z.string(),
  dockerhubUsername: z.string().optional(),
  dockerhubAccessToken: z.string().optional(),
  walletAddress: z.string().optional(),
  walletPrivateKey: z.string().optional(),
  appSecret: z.string().optional().nullable(), // can be null or string (null means do no use secret)
});

// Read JSON configuration file
export async function readIAppConfig() {
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

// Read package.json file
export async function readPackageJonConfig() {
  try {
    const packageContent = await readFile('./package.json', 'utf8');
    return JSON.parse(packageContent);
  } catch {
    throw Error('Failed to read `package.json` file.');
  }
}

// Utility function to write the iApp JSON configuration file
export async function writeIAppConfig(config) {
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}
