import { Wallet } from 'ethers';
import { readIAppConfig, writeIAppConfig } from './iAppConfigFile.js';

export async function generateWallet() {
  const { privateKey, address } = Wallet.createRandom();
  const config = await readIAppConfig();
  await writeIAppConfig({
    ...config,
    walletAddress: address,
    walletPrivateKey: privateKey,
  });
  return address;
}
