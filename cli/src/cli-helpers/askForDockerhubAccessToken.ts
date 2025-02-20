import { readIAppConfig, writeIAppConfig } from '../utils/iAppConfigFile.js';
import { CONFIG_FILE } from '../config/config.js';
import * as color from './color.js';
import type { Spinner } from './spinner.js';

export async function askForDockerhubAccessToken({
  spinner,
}: {
  spinner: Spinner;
}): Promise<string> {
  const config = await readIAppConfig();

  const dockerhubAccessToken = config.dockerhubAccessToken || '';
  if (dockerhubAccessToken) {
    spinner.log(
      `Using saved dockerhubAccessToken ${color.comment(`(from ${color.file(CONFIG_FILE)})`)}`
    );
    return dockerhubAccessToken;
  }

  const { dockerHubAccessTokenAnswer } = await spinner.prompt({
    type: 'password',
    name: 'dockerHubAccessTokenAnswer',
    message: `What is your DockerHub access token?
${color.promptHelper(`You need to provide a Personal access token with ${color.emphasis('Read & Write')} access
This token will be used to push your iApp docker images to your account
You can create a new token by visiting ${color.link('https://app.docker.com/settings/personal-access-tokens/create')}`)}`,
  });

  // TODO check token against API
  if (!/[a-zA-Z0-9-]+/.test(dockerHubAccessTokenAnswer)) {
    spinner.log(color.error('Invalid DockerHub access token.'));
    return askForDockerhubAccessToken({ spinner });
  }

  // Save it into JSON config file
  config.dockerhubAccessToken = dockerHubAccessTokenAnswer;
  await writeIAppConfig(config);
  spinner.log(`dockerhubAccessToken saved to ${color.file(CONFIG_FILE)}`);

  return dockerHubAccessTokenAnswer;
}
