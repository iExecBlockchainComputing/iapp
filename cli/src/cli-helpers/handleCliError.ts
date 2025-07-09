import type { Spinner } from './spinner.js';
import { error as colorError } from './color.js';

export const handleCliError = ({
  spinner,
  error,
}: {
  spinner: Spinner;
  error: unknown;
}) => {
  const shouldBreakLine = spinner.text && !spinner.text.endsWith('\n');
  const message = error instanceof Error ? error.message : String(error);
  spinner.fail(
    colorError(spinner.text + (shouldBreakLine ? '\n' : '') + message)
  );
  process.exit(1);
};
