import { askForImportWallet } from '../cli-helpers/askForWallet.js';
import { handleCliError } from '../cli-helpers/handleCliError.js';
import { getSpinner } from '../cli-helpers/spinner.js';
import * as color from '../cli-helpers/color.js';
import { warnBeforeDeletePrivateKey } from '../cli-helpers/warnBeforeDeletePrivateKey.js';
import { goToProjectRoot } from '../cli-helpers/goToProjectRoot.js';

export async function walletImport() {
  const spinner = getSpinner();
  try {
    await goToProjectRoot({ spinner });
    spinner.text = 'Importing wallet';
    await warnBeforeDeletePrivateKey({ spinner });
    const signer = await askForImportWallet({ spinner });
    const address = await signer.getAddress();
    spinner.succeed(`Imported wallet ${color.emphasis(address)}`);
  } catch (error) {
    handleCliError({ spinner, error });
  }
}
