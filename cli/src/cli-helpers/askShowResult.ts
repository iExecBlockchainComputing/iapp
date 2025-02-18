import { readdir } from 'node:fs/promises';
import { getDeterministicOutputAsText } from '../utils/deterministicOutput.js';
import * as color from './color.js';
import type { Spinner } from './spinner.js';

export async function askShowResult({
  spinner,
  outputPath,
}: {
  spinner: Spinner;
  outputPath: string;
}) {
  // Prompt user to view result
  const continueAnswer = await spinner.prompt({
    type: 'confirm',
    name: 'continue',
    message: `Would you like to see the result? ${color.promptHelper(`(View ${color.file(`./${outputPath}/`)})`)}`,
    initial: true,
  });
  if (continueAnswer.continue) {
    const files = await readdir(outputPath).catch(() => [] as string[]);
    spinner.newLine();
    if (files.length === 0) {
      spinner.warn('output directory is empty');
    } else {
      spinner.info(
        `output directory content:\n${files.map((file) => '  - ' + color.file(file)).join('\n')}`
      );
      // best effort display deterministic output file if it's an utf8 encoded file
      await getDeterministicOutputAsText({ outputPath })
        .then(({ text, path }) => {
          spinner.newLine();
          spinner.info(`${color.file(path)}:\n${text}`);
        })
        .catch(() => {});
    }
  }
}
