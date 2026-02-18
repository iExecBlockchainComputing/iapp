import { v4 as uuidV4 } from 'uuid';
import { ethers } from 'ethers';
import { utils } from 'iexec';
import { ConsumableDatasetorder } from 'iexec/IExecOrderModule';
import { mkdir, rm } from 'node:fs/promises';
import { askForWallet } from '../cli-helpers/askForWallet.js';
import { RUN_OUTPUT_DIR, TASK_OBSERVATION_TIMEOUT } from '../config/config.js';
import { addRunData } from '../utils/cacheExecutions.js';
import { getSpinner, type Spinner } from '../cli-helpers/spinner.js';
import { handleCliError } from '../cli-helpers/handleCliError.js';
import { getIExec } from '../utils/iexec.js';
import { extractZipToFolder } from '../utils/extractZipToFolder.js';
import { askShowResult } from '../cli-helpers/askShowResult.js';
import { goToProjectRoot } from '../cli-helpers/goToProjectRoot.js';
import * as color from '../cli-helpers/color.js';
import { IExec } from 'iexec';
import { readIAppConfig } from '../utils/iAppConfigFile.js';
import { ensureBalances } from '../cli-helpers/ensureBalances.js';
import { askForAcknowledgment } from '../cli-helpers/askForAcknowledgment.js';
import { warnBeforeTxFees } from '../cli-helpers/warnBeforeTxFees.js';
import { resolveChainConfig } from '../cli-helpers/resolveChainConfig.js';

export async function run({
  iAppAddress,
  args,
  protectedData = [],
  inputFile: inputFiles = [], // rename variable (it's an array)
  requesterSecret: requesterSecrets = [], // rename variable (it's an array)
  chain,
}: {
  iAppAddress: string;
  args?: string;
  protectedData?: string[];
  inputFile?: string[];
  requesterSecret?: { key: number; value: string }[];
  chain?: string;
}) {
  const spinner = getSpinner();
  try {
    await goToProjectRoot({ spinner });
    await cleanRunOutput({ spinner, outputFolder: RUN_OUTPUT_DIR });

    const { defaultChain } = await readIAppConfig();
    const chainConfig = resolveChainConfig({
      chain,
      defaultChain,
      spinner,
    });
    await warnBeforeTxFees({ spinner, chain: chainConfig.name });

    spinner.start('checking inputs...');
    // initialize iExec
    const readOnlyIexec = getIExec(chainConfig);

    // input checks
    if ((await readOnlyIexec.app.checkDeployedApp(iAppAddress)) === false) {
      throw Error('No iApp found at the specified address.');
    }

    const { app } = await readOnlyIexec.app.showApp(iAppAddress);
    // determine TEE framework based on app properties (SCONE apps define `appMREnclave`, TDX apps do NOT define `appMREnclave`)
    const isTdxApp = !app.appMREnclave;
    const teeFramework = isTdxApp ? 'tdx' : 'scone';
    // check TEE framework compatibility with selected chain
    try {
      await readOnlyIexec.config.resolveSmsURL({ teeFramework });
    } catch {
      throw new Error(
        `TEE framework ${teeFramework.toUpperCase()} is not supported on the selected chain`
      );
    }

    if (protectedData.length > 0) {
      await Promise.all(
        protectedData.map(async (dataset) => {
          if (
            (await readOnlyIexec.dataset.checkDeployedDataset(dataset)) ===
            false
          ) {
            throw Error(`No protectedData found at ${dataset}.`);
          }
          const isSecretSet =
            await readOnlyIexec.dataset.checkDatasetSecretExists(dataset, {
              teeFramework,
            });
          if (!isSecretSet) {
            throw Error(
              `The protectedData secret key for ${dataset} is not registered in the Secret Management Service (SMS) of iExec protocol.`
            );
          }
        })
      );
    }

    // Get wallet from privateKey
    const signer = await askForWallet({ spinner });
    const userAddress = await signer.getAddress();

    const iexec = getIExec({
      ...chainConfig,
      signer,
    });

    // App Order
    spinner.start('Creating app order...');
    const apporderTemplate = await iexec.order.createApporder({
      app: iAppAddress,
      requesterrestrict: userAddress,
      tag: ['tee', teeFramework],
    });
    const apporder = await iexec.order.signApporder(apporderTemplate);
    spinner.succeed('AppOrder created');

    // Dataset Order
    let bulkCid: string | undefined;
    let volume = 1;
    let datasetorders: ConsumableDatasetorder[] = [];
    if (protectedData.length > 0) {
      spinner.start('Fetching protectedData access...');
      datasetorders = await Promise.all(
        protectedData.map(async (dataset) => {
          const datasetOrderbook = await iexec.orderbook.fetchDatasetOrderbook({
            dataset,
            app: iAppAddress,
            requester: userAddress,
            minTag: ['tee'], // TEE framework tag is ignored for dataset order matching, as dataset can be shared between SCONE and TDX apps
            bulkOnly: protectedData.length > 1, // bulk if multiple datasets
          });
          const datasetorder = datasetOrderbook.orders[0]?.order;
          if (!datasetorder) {
            throw Error(
              `No matching ProtectedData access found, It seems your iApp is not allowed to access the protectedData ${dataset}, please grantAccess to it`
            );
          }
          return datasetorder;
        })
      );
      spinner.succeed('ProtectedData access found');
      if (protectedData.length > 1) {
        spinner.start('Preparing bulk access...');
        const bulk = await iexec.order.prepareDatasetBulk(datasetorders);
        bulkCid = bulk.cid;
        volume = bulk.volume;
      }
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
              teeFramework,
            });
            return [key, name];
          })
        )
      );
      spinner.succeed('Requester secrets provisioned');
    }

    // Workerpool Order
    spinner.start('Fetching workerpool order...');
    const workerpoolOrderbook = await iexec.orderbook.fetchWorkerpoolOrderbook({
      workerpool: isTdxApp
        ? chainConfig.tdxWorkerpool
        : chainConfig.sconeWorkerpool,
      app: iAppAddress,
      minTag: apporder.tag,
      minVolume: volume, // TODO handle multiple matches if not enough volume
    });
    const workerpoolorder = workerpoolOrderbook.orders[0]?.order;
    if (!workerpoolorder) {
      throw Error(
        'No workerpool order found, Wait until some workerpool order come back'
      );
    }
    spinner.succeed('Workerpool order fetched');

    spinner.start('Creating request order...');
    const requestorderToSign = await iexec.order.createRequestorder({
      app: iAppAddress,
      category: workerpoolorder.category,
      dataset:
        datasetorders.length === 1
          ? datasetorders[0].dataset
          : ethers.ZeroAddress,
      appmaxprice: apporder.appprice,
      datasetmaxprice:
        datasetorders.length === 1
          ? datasetorders[0].datasetprice.toString()
          : 0,
      workerpoolmaxprice: workerpoolorder.workerpoolprice,
      tag: ['tee', teeFramework],
      volume,
      params: {
        iexec_args: args,
        iexec_input_files: inputFiles.length > 0 ? inputFiles : undefined,
        iexec_secrets,
        bulk_cid: bulkCid,
      },
    });
    const requestorder = await iexec.order.signRequestorder(requestorderToSign);
    spinner.succeed('RequestOrder created');

    const matchOrderParams = {
      apporder,
      datasetorder: datasetorders.length === 1 ? datasetorders[0] : undefined,
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
    await addRunData({
      app: iAppAddress,
      dealid,
      taskids: [taskid],
      txHash,
      chainName: chainConfig.name,
    });
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
You can download the result of your task here:
${color.link(`${chainConfig.ipfsGatewayUrl}${location}`)}`);

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
  teeFramework,
}: {
  iexec: IExec;
  value: string;
  teeFramework: 'scone' | 'tdx';
}) {
  const secretName = uuidV4();
  await iexec.secrets.pushRequesterSecret(secretName, value, { teeFramework });
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
