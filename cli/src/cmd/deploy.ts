import {
  dockerBuild,
  pushDockerImage,
  checkDockerDaemon,
} from '../execDocker/docker.js';
import { sconify } from '../utils/sconify.js';
import { askForDockerhubUsername } from '../cli-helpers/askForDockerhubUsername.js';
import { askForWalletAddress } from '../cli-helpers/askForWalletAddress.js';
import {
  projectNameToImageName,
  readIAppConfig,
} from '../utils/iAppConfigFile.js';
import { askForDockerhubAccessToken } from '../cli-helpers/askForDockerhubAccessToken.js';
import { handleCliError } from '../cli-helpers/handleCliError.js';
import { getSpinner } from '../cli-helpers/spinner.js';
import { askForAppSecret } from '../cli-helpers/askForAppSecret.js';
import { askForWalletPrivateKey } from '../cli-helpers/askForWalletPrivateKey.js';
import { Wallet } from 'ethers';
import { getIExecDebug } from '../utils/iexec.js';
import { goToProjectRoot } from '../cli-helpers/goToProjectRoot.js';
import * as color from '../cli-helpers/color.js';
import { hintBox } from '../cli-helpers/box.js';

export async function deploy() {
  const spinner = getSpinner();
  try {
    await goToProjectRoot({ spinner });
    const { projectName, template } = await readIAppConfig();

    const dockerhubUsername = await askForDockerhubUsername({ spinner });
    const dockerhubAccessToken = await askForDockerhubAccessToken({ spinner });

    const { iAppVersion } = await spinner.prompt([
      {
        type: 'text',
        name: 'iAppVersion',
        message: 'What is the version of your iApp?',
        initial: '0.0.1',
      },
    ]);
    // validate image tag https://docs.docker.com/reference/cli/docker/image/tag/
    if (!iAppVersion.match(/[\w][\w.-]{0,127}/)) {
      throw Error('Invalid version');
    }

    const imageTag = `${dockerhubUsername}/${projectNameToImageName(projectName)}:${iAppVersion}`;

    const appSecret = await askForAppSecret({ spinner });

    const walletAddress = await askForWalletAddress({ spinner });

    // if an app secret must be set we will need the app owner wallet to push it
    let iexec;
    if (appSecret !== null) {
      const privateKey = await askForWalletPrivateKey({ spinner });
      const wallet = new Wallet(privateKey);
      const address = await wallet.getAddress();
      if (address.toLowerCase() !== walletAddress.toLowerCase()) {
        throw Error('Provided address and private key mismatch');
      }
      iexec = getIExecDebug(privateKey);
    }

    // just start the spinner, no need to persist success in terminal
    spinner.start('Checking docker daemon is running...');
    await checkDockerDaemon();

    spinner.start('Building docker image...\n');
    const buildLogs = [];
    const imageId = await dockerBuild({
      tag: imageTag,
      progressCallback: (msg) => {
        buildLogs.push(msg); // do we want to show build logs after build is successful?
        spinner.text = spinner.text + color.comment(msg);
      },
    });
    spinner.succeed(`Docker image built (${imageId}) and tagged ${imageTag}`);

    spinner.start('Pushing docker image...\n');
    await pushDockerImage({
      tag: imageTag,
      dockerhubAccessToken,
      dockerhubUsername,
      progressCallback: (msg) => {
        spinner.text = spinner.text + color.comment(msg);
      },
    });
    spinner.succeed(`Pushed image ${imageTag} on dockerhub`);

    spinner.start(
      'Transforming your image into a TEE image and deploying on iExec, this may take a few minutes...'
    );
    const { sconifiedImage, appContractAddress } = await sconify({
      iAppNameToSconify: imageTag,
      template,
      walletAddress,
      dockerhubAccessToken,
      dockerhubUsername,
    });
    spinner.succeed('TEE app deployed');
    if (appSecret !== null && iexec) {
      spinner.start('Attaching app secret to the deployed app');
      await iexec.app.pushAppSecret(appContractAddress, appSecret);
      spinner.succeed('App secret attached to the app');
    }
    spinner.succeed(
      `Deployment of your iApp completed successfully:
  - Docker image: ${sconifiedImage}
  - iApp address: ${appContractAddress}`
    );

    spinner.log(
      hintBox(
        `Run ${color.command(`iapp run ${appContractAddress}`)} to execute your iApp on an iExec TEE worker`
      )
    );
  } catch (error) {
    handleCliError({ spinner, error });
  }
}
