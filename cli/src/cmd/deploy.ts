import {
  dockerBuild,
  pushDockerImage,
  checkDockerDaemon,
  parseImagePath,
  inspectImage,
  tagDockerImage,
} from '../execDocker/docker.js';
import { sconify } from '../utils/sconify.js';
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
import { useTdx } from '../utils/featureFlags.js';
import { ensureBalances } from '../cli-helpers/ensureBalances.js';
import { warnBeforeTxFees } from '../cli-helpers/warnBeforeTxFees.js';
import { resolveChainConfig } from '../cli-helpers/resolveChainConfig.js';

export async function deploy({ chain }: { chain?: string }) {
  const spinner = getSpinner();
  try {
    await goToProjectRoot({ spinner });
    const { projectName, template, defaultChain } = await readIAppConfig();
    const chainConfig = resolveChainConfig({
      chain,
      defaultChain,
      spinner,
    });
    await warnBeforeTxFees({ spinner, chain: chainConfig.name });

    const signer = await askForWallet({ spinner });
    const userAddress = await signer.getAddress();

    // initialize iExec
    const iexec = getIExec({ ...chainConfig, signer });
    // determine TEE framework based on feature flag
    const teeFramework = useTdx ? 'tdx' : 'scone';
    // check TEE framework compatibility with selected chain
    try {
      await iexec.config.resolveSmsURL({ teeFramework });
    } catch {
      throw new Error(
        `TEE framework ${teeFramework.toUpperCase()} is not supported on the selected chain`
      );
    }

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

    let appDockerImage: string;
    let appContractAddress: string;

    if (useTdx) {
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
      appDockerImage = tdxImage;
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
      appContractAddress = address;
    } else {
      spinner.start('Pushing docker image...\n');
      await pushDockerImage({
        tag: nonTeeImage,
        dockerhubAccessToken,
        dockerhubUsername,
        progressCallback: (msg) => {
          spinner.text = spinner.text + color.comment(msg);
        },
      });
      spinner.succeed(`Pushed image ${nonTeeImage} on dockerhub`);
      spinner.start(
        'Transforming your image into a TEE image, this may take a few minutes...'
      );
      const {
        dockerImage,
        dockerImageDigest,
        sconeVersion,
        fingerprint,
        entrypoint,
      } = await sconify({
        iAppNameToSconify: nonTeeImage,
        template,
        walletAddress: userAddress,
        dockerhubAccessToken,
        dockerhubUsername,
      });
      appDockerImage = dockerImage;
      spinner.succeed(`Pushed TEE image ${appDockerImage} on dockerhub`);
      spinner.start('Deploying your TEE app on iExec...');
      const { address } = await iexec.app.deployApp({
        owner: userAddress,
        name: `${projectNameToImageName(projectName)}-${iAppVersion}`,
        type: 'DOCKER',
        multiaddr: dockerImage,
        checksum: `0x${dockerImageDigest}`,
        // Some code sample here: https://github.com/iExecBlockchainComputing/dataprotector-sdk/blob/v2/packages/protected-data-delivery-dapp/deployment/src/singleFunction/deployApp.ts
        mrenclave: {
          framework: 'SCONE',
          version: sconeVersion,
          entrypoint: entrypoint,
          heapSize: 1073741824,
          fingerprint,
        },
      });
      appContractAddress = address;
    }
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
