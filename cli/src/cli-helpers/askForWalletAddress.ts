import { isAddress } from 'ethers';
import { readIAppConfig, writeIAppConfig } from '../utils/iAppConfigFile.js';
import { CONFIG_FILE } from '../config/config.js';
import * as color from './color.js';
import type { Spinner } from './spinner.js';

export async function askForWalletAddress({
  spinner,
}: {
  spinner: Spinner;
}): Promise<string> {
  const config = await readIAppConfig();
  const walletAddress = config.walletAddress || '';
  if (walletAddress) {
    spinner.log(
      `Using saved walletAddress ${color.comment(`(from ${color.file(CONFIG_FILE)})`)}`
    );
    return walletAddress;
  }

  const { walletAddressAnswer } = await spinner.prompt({
    type: 'text',
    name: 'walletAddressAnswer',
    message: 'What is your wallet address?',
  });

  if (!isAddress(walletAddressAnswer)) {
    spinner.log(
      color.error(
        'Invalid wallet address. Ex: 0xC248cCe0a656a90F2Ae27ccfa8Bd11843c8e0f3c'
      )
    );
    return askForWalletAddress({ spinner });
  }

  // Save it into JSON config file
  config.walletAddress = walletAddressAnswer;
  await writeIAppConfig(config);
  spinner.log(`walletAddress saved to ${color.file(CONFIG_FILE)}`);

  return walletAddressAnswer;
}
