import ora, { type Ora } from 'ora';
import prompts from 'prompts';

export type Spinner = Ora & {
  log: (msg: string) => void;
  newLine: () => void;
  prompt: (
    oneQuestion: prompts.PromptObject<string> | prompts.PromptObject<string>[]
  ) => Promise<prompts.Answers<string>>;
};

export const getSpinner = (): Spinner => {
  const spinner = ora();

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

  const prompt = async (
    oneQuestion: prompts.PromptObject<string> | prompts.PromptObject<string>[]
  ) => {
    const { isSpinning } = spinner;
    if (isSpinning) {
      spinner.stop();
    }
    const res = await prompts(oneQuestion, {
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
