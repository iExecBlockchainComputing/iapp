import { Wallet } from 'ethers';
import { readIAppConfig, writeIAppConfig } from '../utils/iAppConfigFile.js';
import { CONFIG_FILE } from '../config/config.js';
import * as color from './color.js';
import type { Spinner } from './spinner.js';

export async function askForWalletPrivateKey({
  spinner,
}: {
  spinner: Spinner;
}): Promise<string> {
  const config = await readIAppConfig();

  const walletPrivateKey = config.walletPrivateKey || '';
  if (walletPrivateKey) {
    spinner.log(
      `Using saved walletPrivateKey ${color.comment(`(from ${color.file(CONFIG_FILE)})`)}`
    );
    return walletPrivateKey;
  }

  const { walletPrivateKeyAnswer } = await spinner.prompt({
    type: 'password',
    name: 'walletPrivateKeyAnswer',
    message: 'What is your wallet private key?',
    mask: '*',
  });

  try {
    new Wallet(walletPrivateKeyAnswer);
  } catch {
    spinner.log(color.error('Invalid wallet private key'));
    return askForWalletPrivateKey({ spinner });
  }

  const { savePrivateKeyAnswer } = await spinner.prompt([
    {
      type: 'confirm',
      name: 'savePrivateKeyAnswer',
      message: 'Do you want to save this private key to your config?',
      initial: false,
    },
  ]);

  if (!savePrivateKeyAnswer) {
    return walletPrivateKeyAnswer;
  }

  config.walletPrivateKey = walletPrivateKeyAnswer;
  await writeIAppConfig(config);
  spinner.log(`walletPrivateKey saved to ${color.file(CONFIG_FILE)}`);

  return walletPrivateKeyAnswer;
}
