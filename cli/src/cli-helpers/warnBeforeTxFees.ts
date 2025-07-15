import type { Spinner } from './spinner.js';
import { askForAcknowledgment } from './askForAcknowledgment.js';

export async function warnBeforeTxFees({
  spinner,
  chain,
}: {
  spinner: Spinner;
  chain: string;
}): Promise<void> {
  if (chain !== 'bellecour') {
    await askForAcknowledgment({
      spinner,
      message:
        'This method requires sending blockchain transactions, transaction fees may be applied. Would you like to continue?',
    });
  }
}
