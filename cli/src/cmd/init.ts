import chalk from 'chalk';
import figlet from 'figlet';
import { mkdir } from 'node:fs/promises';
import { fromError } from 'zod-validation-error';
import { folderExists } from '../utils/fs.utils.js';
import { initIAppWorkspace } from '../utils/initIAppWorkspace.js';
import { getSpinner } from '../cli-helpers/spinner.js';
import { handleCliError } from '../cli-helpers/handleCliError.js';
import { generateWallet } from '../utils/generateWallet.js';
import * as color from '../cli-helpers/color.js';
import { hintBox } from '../cli-helpers/box.js';
import { projectNameSchema } from '../utils/iAppConfigFile.js';
import { TEMPLATES, type TemplateName } from '../config/config.js';

const targetDir = 'hello-world';

export async function init() {
  const spinner = getSpinner();
  try {
    spinner.start('Configuring project...');
    spinner.log(
      chalk.magenta(
        figlet.textSync('IAPP', {
          font: 'Standard',
          horizontalLayout: 'default',
          verticalLayout: 'default',
        })
      )
    );

    const { projectName } = await spinner.prompt({
      type: 'text',
      name: 'projectName',
      message: `What's your project name? ${color.promptHelper('(A folder with this name will be created)')}`,
      initial: targetDir,
      validate: (value) => {
        try {
          projectNameSchema.parse(value);
          return true;
        } catch (e) {
          return fromError(e)
            .details.map((issue) => issue.message)
            .join('; ');
        }
      },
    });

    if (await folderExists(projectName)) {
      throw Error(
        `Target directory "${projectName}" already exists. Remove it or choose a different name.`
      );
    }

    const INIT_BASIC = 'basic';
    const INIT_ADVANCED = 'advanced';

    const { template, initType } = await spinner.prompt([
      {
        type: 'select',
        name: 'template',
        message: 'Which language do you want to use?',
        choices: Object.entries(TEMPLATES).map(([key, val]) => ({
          title: val.title,
          value: key,
          selected: val?.default,
        })),
      },
      {
        type: 'select',
        name: 'initType',
        message: 'What kind of project do you want to init?',
        choices: [
          {
            title: 'Hello World',
            value: INIT_BASIC,
            selected: true,
            description: 'iapp quick start',
          },
          {
            title: 'advanced',
            value: INIT_ADVANCED,
            description: 'more configuration options for advanced users',
          },
        ],
      },
    ]);
    const templateTitle = TEMPLATES[template as TemplateName].title;

    const {
      useArgs = true,
      protectedData = 'useProtectedData',
      useInputFile = false,
      useRequesterSecret = false,
      useAppSecret = false,
    } = initType === INIT_ADVANCED
      ? await spinner.prompt([
          {
            type: 'confirm',
            name: 'useArgs',
            message: `Would you like to use args inside your iApp? ${color.promptHelper(
              '(args are public positional arguments, args are provided by users that will run your iApp)'
            )}`,
            initial: true,
          },
          {
            type: 'confirm',
            name: 'useInputFile',
            message: `Would you like to use input files inside your iApp? ${color.promptHelper(
              '(input files are public files downloaded from the internet, files urls are provided by user that will run your iApp)'
            )}`,
            initial: false,
          },
          {
            type: 'confirm',
            name: 'useRequesterSecret',
            message: `Would you like to use requester secrets inside your iApp? ${color.promptHelper(
              '(requester secrets are secrets strings, secrets are provided by users that will run your iApp)'
            )}`,
            initial: false,
          },
          {
            type: 'select',
            name: 'protectedData',
            message: `Would you like to use protected data inside your iApp? ${color.promptHelper(
              '(protected data a secret file, the protected data is provided by a third party for users that will run your iApp)'
            )}`,
            choices: [
              {
                title: 'no',
                value: 'noProtectedData',
              },
              {
                title: 'yes - only one protected data',
                value: 'useProtectedData',
                selected: true,
                description: 'one protected data per iApp run',
              },
              {
                title: 'yes - many protected data (bulk processing)',
                value: 'useBulkProcessing',
                description:
                  'multiple protected data loaded in the same context of an iApp run',
              },
            ],
          },
          {
            type: 'confirm',
            name: 'useBulkProcessing',
            message: `Would you like to use multiple protected data in bulk processing inside your iApp? ${color.promptHelper(
              '(bulk processing allows you to load multiple protected data files in a single iApp run)'
            )}`,
            initial: false,
          },
          {
            type: 'confirm',
            name: 'useAppSecret',
            message: `Would you like to use an app secret inside your iApp? ${color.promptHelper('(app secret is an immutable secret string provisioned once by the iApp owner)')}`,
            initial: false,
          },
        ])
      : {}; // default

    const useProtectedData = protectedData === 'useProtectedData';
    const useBulkProcessing = protectedData === 'useBulkProcessing';

    await mkdir(projectName);
    process.chdir(projectName);

    // Copying simple project files from templates/

    spinner.start(`Creating ${templateTitle} app...`);
    await initIAppWorkspace({
      projectName,
      template,
      useArgs,
      useProtectedData,
      useBulkProcessing,
      useInputFile,
      useRequesterSecret,
      useAppSecret,
    });
    spinner.succeed(`${templateTitle} app setup complete.`);

    spinner.start('Generating wallet...');
    const walletAddress = await generateWallet();
    spinner.succeed(`Generated ethereum wallet (${walletAddress})`);

    const output = `
  ${chalk.bold.underline('Steps to Get Started:')}
  
    Navigate to your project folder:
    ${color.command(`$ cd ${projectName.split(' ').length > 1 ? `"${projectName}"` : `${projectName}`}`)}
  
    ${color.emphasis('Make your changes in the')} ${color.file(TEMPLATES[template as TemplateName]?.mainFile)} ${color.emphasis('file')}.
  
    -1- Test your iApp locally:
    ${color.command('$ iapp test')}${
      useArgs
        ? `
    ${color.comment('# with args')}
    ${color.command('$ iapp test --args your-name')}`
        : ''
    }${
      useInputFile
        ? `
    ${color.comment('# with input files')}
    ${color.command('$ iapp test --inputFile https://ipfs.iex.ec/ipfs/Qmd286K6pohQcTKYqnS1YhWrCiS4gz7Xi34sdwMe9USZ7u')}`
        : ''
    }${
      useRequesterSecret
        ? `
    ${color.comment('# with requester secrets')}
    ${color.command('$ iapp test --requesterSecret 1=foo 42=bar')}`
        : ''
    }${
      useProtectedData
        ? `
    ${color.comment('# with a protected data')}
    ${color.command('$ iapp test --protectedData default')}`
        : ''
    }${
      useBulkProcessing
        ? `
    ${color.comment('# with a multiple protected data processed in bulk')}
    ${color.command('$ iapp test --protectedData data1 data2 data3')}`
        : ''
    }

    -2- Deploy your iApp on the iExec protocol:
    ${color.command('$ iapp deploy')}
  
    -3- Ask an iExec worker to run your confidential iApp:
    ${color.command('$ iapp run <iapp-address>')}
  `;

    spinner.log(hintBox(output));
  } catch (error) {
    handleCliError({ spinner, error });
  }
}
