import {
  dockerBuild,
  pushDockerImage,
  checkDockerDaemon,
  parseImagePath,
  inspectImage,
  tagDockerImage,
} from '../execDocker/docker.js';
import { askForDockerhubUsername } from '../cli-helpers/askForDockerhubUsername.js';
import {
  projectNameToImageName,
  readIAppConfig,
} from '../utils/iAppConfigFile.js';
import { askForDockerhubAccessToken } from '../cli-helpers/askForDockerhubAccessToken.js';
import { handleCliError } from '../cli-helpers/handleCliError.js';
import { getSpinner } from '../cli-helpers/spinner.js';
import { askForAppSecret } from '../cli-helpers/askForAppSecret.js';
import { askForWallet } from '../cli-helpers/askForWallet.js';
import { getIExec } from '../utils/iexec.js';
import { goToProjectRoot } from '../cli-helpers/goToProjectRoot.js';
import * as color from '../cli-helpers/color.js';
import { hintBox } from '../cli-helpers/box.js';
import { addDeploymentData } from '../utils/cacheExecutions.js';
import { ensureBalances } from '../cli-helpers/ensureBalances.js';
import { warnBeforeTxFees } from '../cli-helpers/warnBeforeTxFees.js';
import { resolveChainConfig } from '../cli-helpers/resolveChainConfig.js';

export async function deploy({ chain }: { chain?: string }) {
  const spinner = getSpinner();
  try {
    await goToProjectRoot({ spinner });
    const { projectName, defaultChain } = await readIAppConfig();
    const chainConfig = resolveChainConfig({
      chain,
      defaultChain,
      spinner,
    });

    await warnBeforeTxFees({ spinner });

    const signer = await askForWallet({ spinner });
    const userAddress = await signer.getAddress();

    // initialize iExec
    const iexec = getIExec({ ...chainConfig, signer });
    // determine TEE framework based on feature flag

    await ensureBalances({ spinner, iexec, warnOnlyRlc: true });

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

    const nonTeeImage = `${dockerhubUsername}/${projectNameToImageName(projectName)}:${iAppVersion}`;

    const appSecret = await askForAppSecret({ spinner });

    // just start the spinner, no need to persist success in terminal
    spinner.start('Checking docker daemon is running...');
    await checkDockerDaemon();

    spinner.start('Building docker image...\n');
    const buildLogs = [];
    const imageId = await dockerBuild({
      tag: nonTeeImage,
      progressCallback: (msg) => {
        buildLogs.push(msg); // do we want to show build logs after build is successful?
        spinner.text = spinner.text + color.comment(msg);
      },
    });
    spinner.succeed(`Docker image built (${imageId})`);

    spinner.start('Pushing docker image...\n');
    const {
      dockerUserName,
      imageName,
      imageTag: originalImageTag,
    } = parseImagePath(nonTeeImage);
    const repo = `${dockerUserName}/${imageName}`;
    const { Id } = await inspectImage(nonTeeImage);
    const tdxImageShortId = Id.split('sha256:')[1].substring(0, 12); // extract 12 first chars after the leading "sha256:"
    const tdxImageTag = `${originalImageTag}-tdx-${tdxImageShortId}`; // add short ID in tag to avoid replacing previous build
    const tdxImage = await tagDockerImage({
      image: nonTeeImage,
      repo,
      tag: tdxImageTag,
    });
    await pushDockerImage({
      tag: tdxImage,
      dockerhubUsername,
      dockerhubAccessToken,
    });
    const appDockerImage = tdxImage;
    spinner.succeed(`Pushed image ${tdxImage} on dockerhub`);
    spinner.start('Deploying your TDX TEE app on iExec...');
    const { RepoDigests } = await inspectImage(tdxImage);
    const { address } = await iexec.app.deployApp({
      owner: await iexec.wallet.getAddress(),
      name: `${imageName}-${originalImageTag}`,
      type: 'DOCKER',
      multiaddr: tdxImage,
      checksum: `0x${RepoDigests[0].split('@sha256:')[1]}`,
    });
    const appContractAddress = address;

    // Add deployment data to deployments.json
    await addDeploymentData({
      image: appDockerImage,
      app: appContractAddress,
      owner: userAddress,
      chainName: chainConfig.name,
    });
    spinner.succeed(
      `TEE app deployed with image ${appDockerImage} on iExec with address ${appContractAddress}`
    );
    if (appSecret !== null && iexec) {
      spinner.start('Attaching app secret to the deployed app');
      await iexec.app.pushAppSecret(appContractAddress, appSecret);
      spinner.succeed('App secret attached to the app');
    }
    spinner.succeed(
      `Deployment of your iApp completed successfully:
  - Docker image: ${appDockerImage}
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
