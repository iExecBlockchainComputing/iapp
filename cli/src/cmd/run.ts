import { v4 as uuidV4 } from 'uuid';
import { ethers } from 'ethers';
import { mkdir, rm } from 'node:fs/promises';
import { askForWalletPrivateKey } from '../cli-helpers/askForWalletPrivateKey.js';
import {
  SCONE_TAG,
  RUN_OUTPUT_DIR,
  TASK_OBSERVATION_TIMEOUT,
} from '../config/config.js';
import { addRunData } from '../utils/cacheExecutions.js';
import { getSpinner, type Spinner } from '../cli-helpers/spinner.js';
import { handleCliError } from '../cli-helpers/handleCliError.js';
import { getIExecDebug } from '../utils/iexec.js';
import { extractZipToFolder } from '../utils/extractZipToFolder.js';
import { askShowResult } from '../cli-helpers/askShowResult.js';
import { goToProjectRoot } from '../cli-helpers/goToProjectRoot.js';
import * as color from '../cli-helpers/color.js';
import { IExec } from 'iexec';
import { getChainConfig, readIAppConfig } from '../utils/iAppConfigFile.js';

export async function run({
  iAppAddress,
  args,
  protectedData,
  inputFile: inputFiles = [], // rename variable (it's an array)
  requesterSecret: requesterSecrets = [], // rename variable (it's an array)
}: {
  iAppAddress: string;
  args?: string;
  protectedData?: string;
  inputFile?: string[];
  requesterSecret?: { key: number; value: string }[];
}) {
  const spinner = getSpinner();
  try {
    await goToProjectRoot({ spinner });
    cleanRunOutput({ spinner, outputFolder: RUN_OUTPUT_DIR });
    await runInDebug({
      iAppAddress,
      args,
      protectedData,
      inputFiles,
      requesterSecrets,
      spinner,
    });
  } catch (error) {
    handleCliError({ spinner, error });
  }
}

export async function runInDebug({
  iAppAddress,
  args,
  protectedData,
  inputFiles = [],
  requesterSecrets = [],
  spinner,
}: {
  iAppAddress: string;
  args?: string;
  protectedData?: string;
  inputFiles?: string[];
  requesterSecrets?: { key: number; value: string }[];
  spinner: Spinner;
}) {
  const { defaultChain: chainName } = await readIAppConfig();
  const chainConfig = getChainConfig(chainName);
  spinner.info(`Using chain ${chainName}`);

  // Is valid iApp address
  if (!ethers.isAddress(iAppAddress)) {
    throw Error(
      'The iApp address is invalid. Be careful ENS name is not implemented yet ...'
    );
  }

  if (protectedData) {
    // Is valid protectedData address
    if (!ethers.isAddress(protectedData)) {
      throw Error(
        'The protectedData address is invalid. Be careful ENS name is not implemented yet ...'
      );
    }
  }

  // Get wallet from privateKey
  const walletPrivateKey = await askForWalletPrivateKey({ spinner });
  const wallet = new ethers.Wallet(walletPrivateKey);

  const iexec = getIExecDebug({
    ...chainConfig,
    privateKey: walletPrivateKey,
  });

  // Make some ProtectedData preflight check
  if (protectedData) {
    try {
      // Check the protectedData has its privateKey registered into the debug sms
      const isSecretSet = await iexec.dataset.checkDatasetSecretExists(
        protectedData,
        {
          teeFramework: 'scone',
        }
      );

      if (!isSecretSet) {
        throw Error(
          `Your protectedData secret key is not registered in the debug secret management service (SMS) of iexec protocol`
        );
      }
    } catch (err) {
      throw Error(
        `Error while running your iApp with your protectedData: ${(err as Error)?.message}`
      );
    }
  }

  // Requester secrets
  let iexec_secrets;
  if (requesterSecrets.length > 0) {
    spinner.start('Provisioning requester secrets...');
    iexec_secrets = Object.fromEntries(
      await Promise.all(
        requesterSecrets.map(async ({ key, value }) => {
          const name = await pushRequesterSecret({ iexec, value });
          return [key, name];
        })
      )
    );
    spinner.succeed('Requester secrets provisioned');
  }
  // Workerpool Order
  spinner.start('Fetching workerpool order...');
  const workerpoolOrderbook = await iexec.orderbook.fetchWorkerpoolOrderbook({
    workerpool: chainConfig.workerpoolDebug,
    app: iAppAddress,
    dataset: protectedData || ethers.ZeroAddress,
    minTag: SCONE_TAG,
    maxTag: SCONE_TAG,
  });
  const workerpoolorder = workerpoolOrderbook.orders[0]?.order;
  if (!workerpoolorder) {
    throw Error(
      'No WorkerpoolOrder found, Wait until some workerpoolOrder come back'
    );
  }
  spinner.succeed('Workerpool order fetched');

  // App Order
  spinner.start('Creating and publishing app order...');
  const apporderTemplate = await iexec.order.createApporder({
    app: iAppAddress,
    requesterrestrict: wallet.address,
    tag: SCONE_TAG,
  });
  const apporder = await iexec.order.signApporder(apporderTemplate);
  spinner.succeed('AppOrder created');

  // Dataset Order
  let datasetorder;
  if (protectedData) {
    spinner.start('Fetching protectedData access...');
    const datasetOrderbook = await iexec.orderbook.fetchDatasetOrderbook(
      protectedData,
      {
        app: iAppAddress,
        workerpool: workerpoolorder.workerpool,
        requester: wallet.address,
        minTag: SCONE_TAG,
        maxTag: SCONE_TAG,
      }
    );
    datasetorder = datasetOrderbook.orders[0]?.order;
    if (!datasetorder) {
      throw Error(
        'No matching ProtectedData access found, It seems your iApp is not allowed to access the protectedData, please grantAccess to it'
      );
    }
    spinner.succeed('ProtectedData access found');
  }

  spinner.start('Creating and publishing request order...');
  const requestorderToSign = await iexec.order.createRequestorder({
    app: iAppAddress,
    category: workerpoolorder.category,
    dataset: protectedData || ethers.ZeroAddress,
    appmaxprice: apporder.appprice,
    datasetmaxprice: datasetorder?.datasetprice || 0,
    workerpoolmaxprice: workerpoolorder.workerpoolprice,
    tag: SCONE_TAG,
    workerpool: workerpoolorder.workerpool,
    params: {
      iexec_args: args,
      iexec_input_files: inputFiles.length > 0 ? inputFiles : undefined,
      iexec_secrets,
    },
  });
  const requestorder = await iexec.order.signRequestorder(requestorderToSign);
  spinner.succeed('RequestOrder created and published');

  spinner.start('Matching orders...');
  const { dealid, txHash } = await iexec.order.matchOrders({
    apporder,
    datasetorder: protectedData ? datasetorder : undefined,
    workerpoolorder,
    requestorder,
  });
  const taskid = await iexec.deal.computeTaskId(dealid, 0);
  await addRunData({ iAppAddress, dealid, taskid, txHash, chainName });
  spinner.succeed(
    `Deal created successfully
  - deal: ${dealid} ${color.link(`${chainConfig.iexecExplorerUrl}/deal/${dealid}`)}
  - task: ${taskid}`
  );

  spinner.start('Observing task...');
  const taskObservable = await iexec.task.obsTask(taskid, { dealid: dealid });
  const taskTimeoutWarning = setTimeout(() => {
    const spinnerText = spinner.text;
    spinner.warn('Task is taking longer than expected...');
    spinner.info(
      `Tip: You can debug this task using ${color.command(`iapp debug ${taskid}`)}`
    );
    spinner.start(spinnerText); // restart spinning
  }, TASK_OBSERVATION_TIMEOUT);
  await new Promise((resolve, reject) => {
    taskObservable.subscribe({
      next: () => {},
      error: (e) => reject(e),
      complete: () => resolve(undefined),
    });
  }).finally(() => {
    clearTimeout(taskTimeoutWarning);
  });

  const task = await iexec.task.show(taskid);
  const { location } = task.results as { storage: string; location?: string };
  spinner.succeed(`Task finalized
You can download the result of your task here: ${color.link(`${chainConfig.ipfsGatewayUrl}${location}`)}`);

  const downloadAnswer = await spinner.prompt({
    type: 'confirm',
    name: 'continue',
    message: 'Would you like to download the result?',
    initial: true,
  });
  if (!downloadAnswer.continue) {
    spinner.stop();
    process.exit(1);
  }

  spinner.start('Downloading result...');
  const outputFolder = RUN_OUTPUT_DIR;
  const taskResult = await iexec.task.fetchResults(taskid);
  const resultBuffer = await taskResult.arrayBuffer();
  await extractZipToFolder(resultBuffer, outputFolder);
  spinner.succeed(`Result downloaded to ${color.file(outputFolder)}`);

  await askShowResult({ spinner, outputPath: outputFolder });
}

/**
 * push a requester secret with a random uuid
 * @returns {string} secretName
 */
async function pushRequesterSecret({
  iexec,
  value,
}: {
  iexec: IExec;
  value: string;
}) {
  const secretName = uuidV4();
  await iexec.secrets.pushRequesterSecret(secretName, value);
  return secretName;
}

async function cleanRunOutput({
  spinner,
  outputFolder,
}: {
  spinner: Spinner;
  outputFolder: string;
}) {
  // just start the spinner, no need to persist success in terminal
  spinner.start('Cleaning output directory...');
  await rm(outputFolder, { recursive: true, force: true });
  await mkdir(outputFolder);
}
