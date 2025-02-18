import { ethers } from 'ethers';
import { askForWalletPrivateKey } from '../cli-helpers/askForWalletPrivateKey.js';
import { getIExecDebug } from '../utils/iexec.js';
import { getSpinner } from '../cli-helpers/spinner.js';
import * as color from '../cli-helpers/color.js';

export async function debug({ taskId }) {
  const spinner = getSpinner();

  if (!ethers.isHexString(taskId, 32)) {
    spinner.log(color.error('The provided task ID is not valid.'));
    return;
  }

  try {
    const walletPrivateKey = await askForWalletPrivateKey({ spinner });
    const iexec = getIExecDebug(walletPrivateKey);

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
        spinner.log(color.comment('[STDERR] No errors'));
      }
    });

    spinner.succeed('Task logs retrieved successfully.');
  } catch (error) {
    handleCliError({ spinner, error });
  }
}
