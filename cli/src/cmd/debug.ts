import { ethers } from 'ethers';
import { askForWallet } from '../cli-helpers/askForWallet.js';
import { getIExecDebug } from '../utils/iexec.js';
import { getSpinner } from '../cli-helpers/spinner.js';
import * as color from '../cli-helpers/color.js';
import { handleCliError } from '../cli-helpers/handleCliError.js';
import { getChainConfig, readIAppConfig } from '../utils/iAppConfigFile.js';
import { goToProjectRoot } from '../cli-helpers/goToProjectRoot.js';

export async function debug({
  taskId,
  chain,
}: {
  taskId: string;
  chain?: string;
}) {
  const spinner = getSpinner();

  try {
    if (!ethers.isHexString(taskId, 32)) {
      throw Error('Invalid task ID');
    }
    await goToProjectRoot({ spinner });
    const { defaultChain } = await readIAppConfig();
    const chainName = chain || defaultChain;
    const chainConfig = getChainConfig(chainName);
    spinner.info(`Using chain ${chainName}`);
    const signer = await askForWallet({ spinner });
    const iexec = getIExecDebug({
      ...chainConfig,
      signer,
    });

    spinner.start('Fetching logs from worker...');
    const logsArray = await iexec.task.fetchLogs(taskId);

    logsArray.forEach(({ worker: workerName, stdout, stderr }) => {
      spinner.log(color.worker(`\nWorker: ${workerName}`));

      if (stdout) {
        spinner.log(color.emphasis.bold('\n[STDOUT]'));
        spinner.log(stdout);
      } else {
        spinner.log(color.comment('\n[STDOUT] No output'));
      }

      if (stderr) {
        spinner.log(color.error.bold('\n[STDERR]'));
        spinner.log(stderr);
      } else {
        spinner.log(color.comment('\n[STDERR] No output'));
      }
    });

    spinner.succeed('Task logs retrieved successfully.');
  } catch (error) {
    handleCliError({ spinner, error });
  }
}
