import ora, { type Ora } from 'ora';
import prompts from 'prompts';
import { AbortError } from '../utils/errors.js';

export type Spinner = Ora & {
  /**
   * stop the spinner and clear the text
   */
  reset: () => void;
  /*
   * log message without disrupting the spinner
   */
  log: (msg: string) => void;
  /**
   * create new line without disrupting the spinner
   */
  newLine: () => void;
  /**
   * prompt using `prompts` without disrupting the spinner
   */
  prompt: <T extends string>(
    questions: prompts.PromptObject<T> | prompts.PromptObject<T>[]
  ) => Promise<prompts.Answers<T>>;
};

export const getSpinner = (): Spinner => {
  const spinner = ora({ isEnabled: !process.env.DEBUG }); // disable spinner when DEBUG is enabled

  const log = (msg: string) => {
    const { isSpinning } = spinner;
    if (isSpinning) {
      spinner.stop();
    }
    // eslint-disable-next-line no-console
    console.log(msg);
    if (isSpinning) {
      spinner.start();
    }
  };

  const newLine = () => log('');

  const reset = () => {
    spinner.text = '';
    spinner.stop();
  };

  const prompt = async <T extends string>(
    questions: prompts.PromptObject<T> | prompts.PromptObject<T>[]
  ) => {
    const { isSpinning } = spinner;
    if (isSpinning) {
      spinner.stop();
    }
    const res = await prompts(questions, {
      onCancel: () => {
        throw new AbortError('Operation cancelled');
      },
    });
    if (isSpinning) {
      spinner.start();
    }
    return res;
  };

  return Object.assign(spinner, {
    reset,
    log,
    newLine,
    prompt,
  });
};
