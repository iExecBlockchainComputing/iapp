import { Wallet } from 'ethers';
import { readIAppConfig } from '../utils/iAppConfigFile.js';
import { CONFIG_FILE } from '../config/config.js';
import * as color from './color.js';
import type { Spinner } from './spinner.js';
import { warnBox } from './box.js';
import { askForAcknowledgment } from './askForAcknowledgment.js';

export async function warnBeforeDeletePrivateKey({
  spinner,
}: {
  spinner: Spinner;
}): Promise<void> {
  const config = await readIAppConfig();
  const { walletPrivateKey } = config;
  let currentWallet;

  if (walletPrivateKey) {
    try {
      currentWallet = new Wallet(walletPrivateKey);
    } catch {
      // noop
    }
    if (currentWallet) {
      spinner.log(
        warnBox(`Wallet ${color.emphasis(currentWallet.address)} private key is saved in your config
  
  Configuring another wallet will remove the saved private key.
  Make sure to save the private key ${color.emphasis('walletPrivateKey')} from ${color.file(CONFIG_FILE)} before proceeding!`)
      );
      await askForAcknowledgment({ spinner });
    }
  }
}
