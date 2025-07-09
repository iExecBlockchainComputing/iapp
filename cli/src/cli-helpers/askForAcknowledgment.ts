import { AbortError } from '../utils/errors.js';
import { Spinner } from './spinner.js';

export async function askForAcknowledgment({
  spinner,
  message = 'Would you like to continue?',
}: {
  spinner: Spinner;
  message?: string;
}) {
  const { ack } = await spinner.prompt({
    type: 'confirm',
    name: 'ack',
    message,
    initial: true,
  });

  if (!ack) {
    throw new AbortError('Operation cancelled');
  }
}
