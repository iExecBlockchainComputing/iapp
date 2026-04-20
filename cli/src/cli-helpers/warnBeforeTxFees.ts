import type { Spinner } from './spinner.js';
import { askForAcknowledgment } from './askForAcknowledgment.js';

export async function warnBeforeTxFees({
  spinner,
}: {
  spinner: Spinner;
}): Promise<void> {
  await askForAcknowledgment({
    spinner,
    message:
      'This method requires sending blockchain transactions, transaction fees will be applied. Would you like to continue?',
  });
}
