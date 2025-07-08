import { AbstractSigner, Wallet } from 'ethers';
import { readIAppConfig, writeIAppConfig } from '../utils/iAppConfigFile.js';
import { CONFIG_FILE } from '../config/config.js';
import * as color from './color.js';
import type { Spinner } from './spinner.js';
import { warnBox } from './box.js';
import {
  KEYSTORE_PATH,
  loadWalletFromKeystore,
  loadWalletInfoFromKeystore,
  saveWalletToKeystore,
  walletFileExistsInKeystore,
} from '../utils/keystore.js';

async function walletFromPrivateKey(spinner: Spinner) {
  const { answer } = await spinner.prompt({
    type: 'password',
    name: 'answer',
    message: 'What is your wallet private key?',
    mask: '*',
  });
  let wallet;
  try {
    wallet = new Wallet(answer);
  } catch {
    spinner.log(color.error('Invalid wallet private key'));
    return walletFromPrivateKey(spinner);
  }
  return wallet;
}

const MIN_PASSWORD_LENGTH = 8;

async function walletToKeyStore({
  spinner,
  wallet,
  warnReplace = true,
}: {
  spinner: Spinner;
  wallet: Wallet;
  warnReplace?: boolean;
}) {
  if (warnReplace) {
    const exists = await walletFileExistsInKeystore({ wallet });
    if (exists) {
      // TODO ask confirmation?
      spinner.warn(
        'A wallet file with this address already exists in the keystore, it will de replaced'
      );
    }
  }
  const { password } = await spinner.prompt({
    type: 'password',
    name: 'password',
    message: `Choose a password to encrypt your wallet`,
    mask: '*',
  });
  if (password?.length < 8) {
    spinner.log(
      color.error(
        `Password must contain at least ${MIN_PASSWORD_LENGTH} characters`
      )
    );
    return walletToKeyStore({ spinner, wallet, warnReplace: false });
  }

  const walletFileName = await saveWalletToKeystore({ wallet, password });
  const config = await readIAppConfig();
  config.walletPrivateKey = undefined;
  config.walletFileName = walletFileName;
  await writeIAppConfig(config);
  spinner.log(
    `walletFileName ${color.file(walletFileName)} saved to ${color.file(CONFIG_FILE)}`
  );
}

async function walletFromKeystore({
  spinner,
  walletFileName,
}: {
  spinner: Spinner;
  walletFileName: string;
}) {
  try {
    const { password } = await spinner.prompt({
      type: 'password',
      name: 'password',
      message: `Enter the password to unlock your wallet ${color.file(walletFileName)}`,
      mask: '*',
    });
    const wallet = await loadWalletFromKeystore({ walletFileName, password });
    return wallet;
  } catch {
    spinner.log(color.error(`Failed to unlock wallet`));
    return walletFromKeystore({
      spinner,
      walletFileName,
    });
  }
}

async function walletToPrivateKeyInConfig({
  spinner,
  wallet,
}: {
  spinner: Spinner;
  wallet: Wallet;
}) {
  const config = await readIAppConfig();
  config.walletFileName = undefined;
  config.walletPrivateKey = wallet.privateKey;
  await writeIAppConfig(config);
  spinner.log(`walletPrivateKey saved to ${color.file(CONFIG_FILE)}`);
}

export async function askForWallet({
  spinner,
  importWallet = false,
}: {
  spinner: Spinner;
  importWallet?: boolean;
}): Promise<AbstractSigner> {
  const config = await readIAppConfig();

  const { walletPrivateKey, walletFileName } = config;
  if (!importWallet) {
    if (walletPrivateKey) {
      try {
        const wallet = new Wallet(walletPrivateKey);
        spinner.log(
          `Using saved walletPrivateKey ${color.comment(`(from ${color.file(CONFIG_FILE)})`)}`
        );
        return wallet;
      } catch {
        spinner.warn(
          `Invalid walletPrivateKey ${color.comment(`(in ${color.file(CONFIG_FILE)})`)}`
        );
      }
    } else if (walletFileName) {
      try {
        spinner.log(
          `Using wallet ${color.file(walletFileName)} ${color.comment(`(from ${color.file(KEYSTORE_PATH)})`)}`
        );
        const { address, isEncrypted } = await loadWalletInfoFromKeystore({
          walletFileName,
        });
        if (address && isEncrypted) {
          const wallet = await walletFromKeystore({ spinner, walletFileName });
          return wallet;
        }
      } catch {
        spinner.warn(
          `Invalid walletFileName ${color.comment(`(in ${color.file(CONFIG_FILE)})`)}`
        );
      }
    }
  }

  if (importWallet && walletPrivateKey) {
    try {
      const currentWallet = new Wallet(walletPrivateKey);
      spinner.log(
        warnBox(`Wallet ${color.emphasis(currentWallet.address)} private key is saved in your config

Importing a new wallet will replace the saved wallet.
Make sure to save the private key ${color.emphasis('walletPrivateKey')} from ${color.file(CONFIG_FILE)} before proceeding!`)
      );
    } catch {
      // noop
    }
  }

  const wallet = await walletFromPrivateKey(spinner);

  const { saveWalletAnswer } = await spinner.prompt([
    {
      type: 'select',
      name: 'saveWalletAnswer',
      message: 'Where do you want to save your wallet?',
      choices: [
        {
          title: 'in the encrypted keystore',
          value: 'keystore',
          description: `encrypted file in ${KEYSTORE_PATH}`,
          selected: true,
        },
        {
          title: 'in iapp config file',
          value: 'config',
          description: `plain text private key in ${CONFIG_FILE}`,
        },
        ...(!importWallet
          ? [
              {
                title: 'do not save',
                value: 'none',
              },
            ]
          : []),
      ],
    },
  ]);
  if (saveWalletAnswer === 'config') {
    await walletToPrivateKeyInConfig({ spinner, wallet });
  } else if (saveWalletAnswer === 'keystore') {
    await walletToKeyStore({ spinner, wallet });
  }
  return wallet;
}
