import type { Spinner } from './spinner.js';

export const handleCliError = ({
  spinner,
  error,
}: {
  spinner: Spinner;
  error: Error;
}) => {
  const shouldBreakLine = !spinner.text.endsWith('\n');
  spinner.fail(
    (spinner.text || 'Unexpected error') +
      (shouldBreakLine ? '\n' : '') +
      `    ${error}`
  );
  process.exit(1);
};
