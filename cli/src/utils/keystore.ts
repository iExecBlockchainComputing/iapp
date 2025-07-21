import { join } from 'path';
import os from 'os';
import { getAddress, Wallet } from 'ethers';
import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import { fileExists } from './fs.utils.js';

export const KEYSTORE_PATH =
  os.platform() === 'win32'
    ? join(os.homedir(), 'AppData', 'Roaming', 'Ethereum', 'keystore')
    : join(os.homedir(), '.ethereum', 'keystore');

function walletToFileName({ wallet }: { wallet: Wallet }) {
  return `${wallet.address}.json`;
}

export async function saveWalletToKeystore({
  wallet,
  password,
}: {
  wallet: Wallet;
  password: string;
}) {
  try {
    const walletFileName = walletToFileName({ wallet });
    const encrypted = await wallet.encrypt(password);
    await mkdir(KEYSTORE_PATH, { recursive: true });
    await writeFile(join(KEYSTORE_PATH, walletFileName), encrypted);
    return walletFileName;
  } catch (e) {
    throw new Error('Failed to save wallet to keystore', { cause: e });
  }
}

export async function loadWalletFromKeystore({
  walletFileName,
  password,
}: {
  walletFileName: string;
  password: string;
}) {
  try {
    const filePath = join(KEYSTORE_PATH, walletFileName);
    const encryptedWallet = await readFile(filePath, 'utf8');
    const wallet = await Wallet.fromEncryptedJson(encryptedWallet, password);
    return wallet;
  } catch (e) {
    throw new Error('Failed to load wallet from keystore', { cause: e });
  }
}

export async function loadWalletInfoFromKeystore({
  walletFileName,
}: {
  walletFileName: string;
}) {
  const filePath = join(KEYSTORE_PATH, walletFileName);
  try {
    const encryptedWallet = await readFile(filePath, 'utf8');
    const { address, Crypto } = JSON.parse(encryptedWallet);
    return {
      address: getAddress(address),
      isEncrypted: !!Crypto,
    };
  } catch (e) {
    throw new Error('Failed to load wallet address from keystore', {
      cause: e,
    });
  }
}

export async function walletFileExistsInKeystore({
  wallet,
}: {
  wallet: Wallet;
}) {
  return fileExists(join(KEYSTORE_PATH, walletToFileName({ wallet })));
}

export async function listWalletsFromKeystore() {
  try {
    const keystoreFiles = await readdir(KEYSTORE_PATH);
    const wallets = await Promise.all(
      keystoreFiles.map((file) =>
        loadWalletInfoFromKeystore({ walletFileName: file })
          .then(({ address, isEncrypted }) => ({ address, file, isEncrypted }))
          .catch(() => null)
      )
    );
    return wallets.filter((val) => val != null);
  } catch (e) {
    throw new Error('Failed to list wallets from keystore', { cause: e });
  }
}
