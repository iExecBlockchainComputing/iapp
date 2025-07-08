import { askForWallet } from '../cli-helpers/askForWallet.js';
import { handleCliError } from '../cli-helpers/handleCliError.js';
import { getSpinner } from '../cli-helpers/spinner.js';
import * as color from '../cli-helpers/color.js';

export async function walletImport() {
  const spinner = getSpinner();
  try {
    spinner.text = 'Importing wallet';
    const signer = await askForWallet({ spinner, importWallet: true });
    const address = await signer.getAddress();
    spinner.succeed(`Imported wallet ${color.emphasis(address)}`);
  } catch (error) {
    handleCliError({ spinner, error });
  }
}
