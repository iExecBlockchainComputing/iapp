import { AbstractSigner, Wallet } from 'ethers';
import { readIAppConfig, writeIAppConfig } from '../utils/iAppConfigFile.js';
import { CONFIG_FILE } from '../config/config.js';
import * as color from './color.js';
import type { Spinner } from './spinner.js';
import { warnBox } from './box.js';

export async function askForWallet({
  spinner,
  replace = false,
  warnIfReplace = true,
}: {
  spinner: Spinner;
  replace?: boolean;
  warnIfReplace?: boolean;
}): Promise<AbstractSigner> {
  const config = await readIAppConfig();
  const currentWalletPrivateKey = config.walletPrivateKey || '';
  if (!replace && currentWalletPrivateKey) {
    try {
      const wallet = new Wallet(currentWalletPrivateKey);
      spinner.log(
        `Using saved walletPrivateKey ${color.comment(`(from ${color.file(CONFIG_FILE)})`)}`
      );
      return wallet;
    } catch {
      spinner.warn(
        `Invalid walletPrivateKey ${color.comment(`(in ${color.file(CONFIG_FILE)})`)}`
      );
    }
  }

  if (replace && currentWalletPrivateKey && warnIfReplace) {
    try {
      const currentWallet = new Wallet(currentWalletPrivateKey);
      spinner.log(
        warnBox(`Wallet ${color.emphasis(currentWallet.address)} is saved in your config

Importing a new wallet will replace the saved wallet.
Make sure to save the private key ${color.emphasis('walletPrivateKey')} from ${color.file(CONFIG_FILE)} before proceeding!`)
      );
    } catch {
      // noop
    }
  }

  const { walletPrivateKeyAnswer } = await spinner.prompt({
    type: 'password',
    name: 'walletPrivateKeyAnswer',
    message: 'What is your wallet private key?',
    mask: '*',
  });

  let wallet;
  try {
    wallet = new Wallet(walletPrivateKeyAnswer);
  } catch {
    spinner.log(color.error('Invalid wallet private key'));
    return askForWallet({ spinner, replace, warnIfReplace: false });
  }

  if (!replace) {
    const { savePrivateKeyAnswer } = await spinner.prompt([
      {
        type: 'confirm',
        name: 'savePrivateKeyAnswer',
        message: 'Do you want to save this private key to your config?',
        initial: false,
      },
    ]);
    if (!savePrivateKeyAnswer) {
      return wallet;
    }
  }

  config.walletPrivateKey = walletPrivateKeyAnswer;
  await writeIAppConfig(config);
  spinner.log(`walletPrivateKey saved to ${color.file(CONFIG_FILE)}`);

  return wallet;
}
