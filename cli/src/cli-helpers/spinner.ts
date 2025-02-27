import ora, { type Ora } from 'ora';
import prompts from 'prompts';

export type Spinner = Ora & {
  log: (msg: string) => void;
  newLine: () => void;
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

  const prompt = async <T extends string>(
    questions: prompts.PromptObject<T> | prompts.PromptObject<T>[]
  ) => {
    const { isSpinning } = spinner;
    if (isSpinning) {
      spinner.stop();
    }
    const res = await prompts(questions, {
      onCancel: () => {
        spinner?.fail('Operation cancelled');
        process.exit(0);
      },
    });
    if (isSpinning) {
      spinner.start();
    }
    return res;
  };

  return Object.assign(spinner, {
    /*
     * log message without disrupting the spinner
     */
    log,
    /**
     * create new line without disrupting the spinner
     */
    newLine,
    /**
     * prompt using `prompts` without disrupting the spinner
     */
    prompt,
  });
};
