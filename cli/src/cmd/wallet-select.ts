import { handleCliError } from '../cli-helpers/handleCliError.js';
import { getSpinner } from '../cli-helpers/spinner.js';
import * as color from '../cli-helpers/color.js';
import { KEYSTORE_PATH, listWalletsFromKeystore } from '../utils/keystore.js';
import { warnBeforeDeletePrivateKey } from '../cli-helpers/warnBeforeDeletePrivateKey.js';
import { readIAppConfig, writeIAppConfig } from '../utils/iAppConfigFile.js';

export async function walletSelect() {
  const spinner = getSpinner();
  try {
    spinner.text = 'Selecting wallet';
    await warnBeforeDeletePrivateKey({ spinner });
    const config = await readIAppConfig();

    const wallets = await listWalletsFromKeystore();
    spinner.info(
      `${wallets.length} wallet files found in keystore ${color.file(KEYSTORE_PATH)}`
    );
    if (wallets.length === 0) {
      return;
    }

    const { walletFileName } = await spinner.prompt({
      type: 'select',
      name: 'walletFileName',
      message: 'Which wallet file do you want to use?',
      choices: wallets.map(({ file, address }) => ({
        title: file,
        value: file,
        description: address,
        selected: config?.walletFileName === file,
      })),
    });

    config.walletPrivateKey = undefined;
    config.walletFileName = walletFileName;
    await writeIAppConfig(config);

    spinner.succeed(`Selected wallet ${color.file(walletFileName)}`);
  } catch (error) {
    handleCliError({ spinner, error });
  }
}
