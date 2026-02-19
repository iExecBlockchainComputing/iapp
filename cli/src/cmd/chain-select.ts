import { handleCliError } from '../cli-helpers/handleCliError.js';
import { getSpinner } from '../cli-helpers/spinner.js';
import * as color from '../cli-helpers/color.js';
import { readIAppConfig, writeIAppConfig } from '../utils/iAppConfigFile.js';
import { goToProjectRoot } from '../cli-helpers/goToProjectRoot.js';

export async function chainSelect({ chainName }: { chainName: string }) {
  const spinner = getSpinner();
  try {
    await goToProjectRoot({ spinner });
    spinner.text = 'Selecting chain';
    const config = await readIAppConfig();
    config.defaultChain = chainName;
    await writeIAppConfig(config);
    spinner.succeed(`Default chain set to ${color.file(chainName)}`);
  } catch (error) {
    handleCliError({ spinner, error });
  }
}
