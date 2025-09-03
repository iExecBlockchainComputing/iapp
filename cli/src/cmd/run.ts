import { v4 as uuidV4 } from 'uuid';
import { ethers } from 'ethers';
import { utils } from 'iexec';
import { mkdir, rm } from 'node:fs/promises';
import { askForWallet } from '../cli-helpers/askForWallet.js';
import {
  SCONE_TAG,
  RUN_OUTPUT_DIR,
  TASK_OBSERVATION_TIMEOUT,
} from '../config/config.js';
import { addRunData } from '../utils/cacheExecutions.js';
import { getSpinner, type Spinner } from '../cli-helpers/spinner.js';
import { handleCliError } from '../cli-helpers/handleCliError.js';
import { getIExec } from '../utils/iexec.js';
import { extractZipToFolder } from '../utils/extractZipToFolder.js';
import { askShowResult } from '../cli-helpers/askShowResult.js';
import { goToProjectRoot } from '../cli-helpers/goToProjectRoot.js';
import * as color from '../cli-helpers/color.js';
import { IExec } from 'iexec';
import { getChainConfig, readIAppConfig } from '../utils/iAppConfigFile.js';
import { getIExecTdx, WORKERPOOL_TDX } from '../utils/tdx-poc.js';
import { useTdx } from '../utils/featureFlags.js';
import { ensureBalances } from '../cli-helpers/ensureBalances.js';
import { askForAcknowledgment } from '../cli-helpers/askForAcknowledgment.js';
import { warnBeforeTxFees } from '../cli-helpers/warnBeforeTxFees.js';

export async function run({
  iAppAddress,
  args,
  protectedData,
  inputFile: inputFiles = [], // rename variable (it's an array)
  requesterSecret: requesterSecrets = [], // rename variable (it's an array)
  chain,
}: {
  iAppAddress: string;
  args?: string;
  protectedData?: string;
  inputFile?: string[];
  requesterSecret?: { key: number; value: string }[];
  chain?: string;
}) {
  const spinner = getSpinner();
  try {
    await goToProjectRoot({ spinner });
    await cleanRunOutput({ spinner, outputFolder: RUN_OUTPUT_DIR });

    const { defaultChain } = await readIAppConfig();
    const chainName = chain || defaultChain;
    const chainConfig = getChainConfig(chainName);
    spinner.info(`Using chain ${chainName}`);
    await warnBeforeTxFees({ spinner, chain: chainConfig.name });

    spinner.start('checking inputs...');
    let readOnlyIexec: IExec;
    if (useTdx) {
      readOnlyIexec = getIExecTdx(chainConfig);
    } else {
      readOnlyIexec = getIExec(chainConfig);
    }

    // input checks
    if ((await readOnlyIexec.app.checkDeployedApp(iAppAddress)) === false) {
      throw Error('No iApp found at the specified address.');
    }
    if (protectedData) {
      if (
        (await readOnlyIexec.dataset.checkDeployedDataset(protectedData)) ===
        false
      ) {
        throw Error('No protectedData found at the specified address.');
      }
      const isSecretSet = await readOnlyIexec.dataset.checkDatasetSecretExists(
        protectedData,
        {
          teeFramework: 'scone',
        }
      );
      if (!isSecretSet) {
        throw Error(
          `The protectedData secret key is not registered in the Secret Management Service (SMS) of iExec protocol.`
        );
      }
    }

    // Get wallet from privateKey
    const signer = await askForWallet({ spinner });
    const userAddress = await signer.getAddress();

    let iexec: IExec;
    if (useTdx) {
      iexec = getIExecTdx({ ...chainConfig, signer });
    } else {
      iexec = getIExec({
        ...chainConfig,
        signer,
      });
    }

    // Workerpool Order
    spinner.start('Fetching workerpool order...');
    const workerpoolOrderbook = await iexec.orderbook.fetchWorkerpoolOrderbook({
      workerpool: useTdx ? WORKERPOOL_TDX : chainConfig.workerpool,
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
    spinner.start('Creating app order...');
    const apporderTemplate = await iexec.order.createApporder({
      app: iAppAddress,
      requesterrestrict: userAddress,
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
          requester: userAddress,
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

    // Requester secrets
    let iexec_secrets;
    if (requesterSecrets.length > 0) {
      spinner.start('Provisioning requester secrets...');
      iexec_secrets = Object.fromEntries(
        await Promise.all(
          requesterSecrets.map(async ({ key, value }) => {
            const name = await pushRequesterSecret({
              iexec,
              value,
            });
            return [key, name];
          })
        )
      );
      spinner.succeed('Requester secrets provisioned');
    }

    spinner.start('Creating request order...');
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
    spinner.succeed('RequestOrder created');

    const matchOrderParams = {
      apporder,
      datasetorder: protectedData ? datasetorder : undefined,
      workerpoolorder,
      requestorder,
    };

    spinner.start('Checking balances...');
    const { total, sponsored } =
      await iexec.order.estimateMatchOrders(matchOrderParams);
    const priceToPay = total.sub(sponsored);
    const balances = await ensureBalances({
      spinner,
      iexec,
      nRlcMin: priceToPay,
    });

    if (!priceToPay.isZero()) {
      await askForAcknowledgment({
        spinner,
        message: `You will spend ${utils.formatRLC(priceToPay)} RLC to run your iApp. Would you like to continue?`,
      });
    }

    if (balances.stake.lt(priceToPay)) {
      const toDeposit = priceToPay.sub(balances.stake);
      await askForAcknowledgment({
        spinner,
        message: `Current account stake is ${utils.formatRLC(balances.stake)} RLC, you need to deposit an additional ${utils.formatRLC(toDeposit)} RLC from your wallet. Would you like to continue?`,
      });
      await iexec.account.deposit(toDeposit);
    }

    spinner.start('Matching orders...');
    const { dealid, txHash } = await iexec.order.matchOrders(matchOrderParams);
    const taskid = await iexec.deal.computeTaskId(dealid, 0);
    await addRunData({ app: iAppAddress, dealid, taskid, txHash, chainName });
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
  } catch (error) {
    handleCliError({ spinner, error });
  }
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
  spinner.reset();
}
