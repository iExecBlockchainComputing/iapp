import {
  dockerBuild,
  pushDockerImage,
  checkDockerDaemon,
} from '../execDocker/docker.js';
import { sconify } from '../utils/sconify.js';
import { askForDockerhubUsername } from '../cli-helpers/askForDockerhubUsername.js';
import {
  getChainConfig,
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
import { deployTdxApp, getIExecTdx } from '../utils/tdx-poc.js';
import { useTdx } from '../utils/featureFlags.js';
import { ensureBalances } from '../cli-helpers/ensureBalances.js';
import { warnBeforeTxFees } from '../cli-helpers/warnBeforeTxFees.js';

export async function deploy({ chain }: { chain?: string }) {
  const spinner = getSpinner();
  try {
    await goToProjectRoot({ spinner });
    const { projectName, template, defaultChain } = await readIAppConfig();
    const chainName = chain || defaultChain;
    const chainConfig = getChainConfig(chainName);
    spinner.info(`Using chain ${chainName}`);
    await warnBeforeTxFees({ spinner, chain: chainConfig.name });

    const signer = await askForWallet({ spinner });
    const userAddress = await signer.getAddress();

    // initialize iExec
    let iexec;
    if (useTdx) {
      iexec = getIExecTdx({ ...chainConfig, signer });
    } else {
      iexec = getIExec({ ...chainConfig, signer });
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

    const imageTag = `${dockerhubUsername}/${projectNameToImageName(projectName)}:${iAppVersion}`;

    const appSecret = await askForAppSecret({ spinner });

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

    let appDockerImage: string;
    let appContractAddress: string;

    if (useTdx && iexec) {
      spinner.start('Deploying your TDX TEE app on iExec...');
      ({ tdxImage: appDockerImage, appContractAddress } = await deployTdxApp({
        iexec,
        image: imageTag,
        dockerhubAccessToken,
        dockerhubUsername,
      }));
    } else {
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
        iAppNameToSconify: imageTag,
        template,
        walletAddress: userAddress,
        dockerhubAccessToken,
        dockerhubUsername,
      });
      appDockerImage = dockerImage;
      spinner.succeed(`Pushed TEE image ${appDockerImage} on dockerhub`);

      spinner.start('Deploying your TEE app on iExec...');
      ({ address: appContractAddress } = await iexec.app.deployApp({
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
      }));
    }

    // Add deployment data to deployments.json
    await addDeploymentData({
      sconifiedImage: appDockerImage,
      appContractAddress: appContractAddress,
      owner: userAddress,
      chainName,
    });

    spinner.succeed('TEE app deployed');
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
