import { readIAppConfig, writeIAppConfig } from '../utils/iAppConfigFile.js';
import { CONFIG_FILE } from '../config/config.js';
import * as color from './color.js';

export async function askForDockerhubUsername({ spinner }) {
  const config = await readIAppConfig();

  const dockerhubUsername = config.dockerhubUsername || '';
  if (dockerhubUsername) {
    spinner.log(
      `Using saved dockerhubUsername ${color.comment(`(from ${color.file(CONFIG_FILE)})`)} -> ${dockerhubUsername}`
    );
    return dockerhubUsername;
  }

  const { dockerHubUserNameAnswer } = await spinner.prompt({
    type: 'text',
    name: 'dockerHubUserNameAnswer',
    message: `What is your username on DockerHub? ${color.promptHelper('(It will be used to properly tag the Docker image)')}`,
  });

  // TODO check username against API
  if (!/[a-zA-Z0-9-]+/.test(dockerHubUserNameAnswer)) {
    spinner.log(
      color.error(
        `Invalid DockerHub username. Login to ${color.link('https://hub.docker.com')} to check your username.`
      )
    );
    return askForDockerhubUsername({ spinner });
  }

  // Save it into JSON config file
  config.dockerhubUsername = dockerHubUserNameAnswer;
  await writeIAppConfig(config);
  spinner.log(`dockerhubUsername saved to ${color.file(CONFIG_FILE)}`);

  return dockerHubUserNameAnswer;
}
