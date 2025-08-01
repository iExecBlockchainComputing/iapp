import { AbstractSigner, Wallet } from 'ethers';
import { readIAppConfig, writeIAppConfig } from '../utils/iAppConfigFile.js';
import { CONFIG_FILE } from '../config/config.js';
import * as color from './color.js';
import type { Spinner } from './spinner.js';
import {
  KEYSTORE_PATH,
  loadWalletFromKeystore,
  loadWalletInfoFromKeystore,
  saveWalletToKeystore,
  walletFileExistsInKeystore,
} from '../utils/keystore.js';
import { AbortError } from '../utils/errors.js';

async function createWalletFromPrivateKey(spinner: Spinner) {
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
    return createWalletFromPrivateKey(spinner);
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
        'A wallet file with this address already exists in the keystore, it will be replaced'
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
  const { password } = await spinner.prompt({
    type: 'password',
    name: 'password',
    message: `Enter the password to unlock your wallet ${color.file(walletFileName)}`,
    mask: '*',
  });
  try {
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

async function askSaveWallet({
  spinner,
  wallet,
  forceSave = false,
}: {
  spinner: Spinner;
  wallet: Wallet;
  forceSave?: boolean;
}) {
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
        ...(!forceSave
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
}

export async function askForWallet({
  spinner,
}: {
  spinner: Spinner;
}): Promise<AbstractSigner> {
  const config = await readIAppConfig();

  // try loading wallet from config
  const { walletPrivateKey, walletFileName } = config;
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
    } catch (e) {
      if (e instanceof AbortError) throw e;
      spinner.warn(
        `Invalid walletFileName ${color.comment(`(in ${color.file(CONFIG_FILE)})`)}`
      );
    }
  }

  // if no wallet is found in config, ask for a new one
  const wallet = await createWalletFromPrivateKey(spinner);
  await askSaveWallet({
    spinner,
    wallet,
  });
  return wallet;
}

export async function askForImportWallet({
  spinner,
}: {
  spinner: Spinner;
}): Promise<AbstractSigner> {
  const wallet = await createWalletFromPrivateKey(spinner);
  await askSaveWallet({ spinner, wallet, forceSave: true }); // always save when importing
  return wallet;
}
