import { readIDappConfig, writeIDappConfig } from '../utils/idappConfigFile.js';
import { CONFIG_FILE } from '../config/config.js';

/**
 * @returns {Promise<string | null>}
 */
export async function askForAppSecret({ spinner }) {
  const config = await readIDappConfig();
  const { appSecret: savedAppSecret } = config;

  if (savedAppSecret === null) {
    spinner.log(`App secret is disabled (from "${CONFIG_FILE}")`);
    return savedAppSecret;
  }
  if (savedAppSecret !== undefined) {
    spinner.log(`Using saved appSecret (from "${CONFIG_FILE}")`);
    return savedAppSecret;
  }

  const { useAppSecret } = await spinner.prompt({
    type: 'confirm',
    name: 'useAppSecret',
    message: `Do you want to attach an app secret to your app`,
    default: false,
  });

  if (!useAppSecret) {
    const { saveNull } = await spinner.prompt([
      {
        type: 'confirm',
        name: 'saveNull',
        message:
          'Do you want to save your choice (no app secret) to your config?',
        default: false,
      },
    ]);
    if (saveNull) {
      config.appSecret = null;
      await writeIDappConfig(config);
      spinner.log(`appSecret disabled saved to "${CONFIG_FILE}"`);
    }
    return null;
  }

  const { appSecret } = await spinner.prompt({
    type: 'password',
    name: 'appSecret',
    message: 'What is the app secret?',
    mask: '*',
  });

  const { saveAppSecret } = await spinner.prompt([
    {
      type: 'confirm',
      name: 'saveAppSecret',
      message: 'Do you want to save this app secret to your config?',
      default: false,
    },
  ]);

  if (saveAppSecret) {
    config.appSecret = appSecret;
    await writeIDappConfig(config);
    spinner.log(`appSecret saved to "${CONFIG_FILE}"`);
  }

  return appSecret;
}
