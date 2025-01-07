import chalk from 'chalk';
import boxen from 'boxen';
import figlet from 'figlet';
import { mkdir } from 'node:fs/promises';
import { folderExists } from '../utils/fs.utils.js';
import { initHelloWorldApp } from '../utils/initHelloWorldApp.js';
import { getSpinner } from '../cli-helpers/spinner.js';
import { handleCliError } from '../cli-helpers/handleCliError.js';
import { generateWallet } from '../utils/generateWallet.js';
import * as color from '../cli-helpers/color.js';

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
    });

    if (await folderExists(projectName)) {
      throw Error(
        `Target directory "${projectName}" already exists. Remove it or choose a different name.`
      );
    }

    const INIT_BASIC = 'basic';
    const INIT_ADVANCED = 'advanced';
    const { initType } = await spinner.prompt({
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
    });

    const {
      useArgs = true,
      useProtectedData = true,
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
            type: 'confirm',
            name: 'useProtectedData',
            message: `Would you like to access a protected data inside your iApp? ${color.promptHelper(
              '(protected data a secret file, the protected data is provided by a third party for users that will run your iApp)'
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

    await mkdir(projectName);
    process.chdir(projectName);

    spinner.log('-----');
    spinner.log(
      'ℹ️  LIMITATION: Your JavaScript code will be run in a Node.js v14.4 environment with npm v6.'
    );
    spinner.log('-----');

    // Copying JavaScript simple project files from templates/

    spinner.start('Creating "Hello World" JavaScript app...');
    await initHelloWorldApp({
      projectName,
      useArgs,
      useProtectedData,
      useInputFile,
      useRequesterSecret,
      useAppSecret,
    });
    spinner.succeed('JavaScript app setup complete.');

    spinner.start('Generating wallet...');
    const walletAddress = await generateWallet();
    spinner.succeed(`Generated ethereum wallet (${walletAddress})`);

    const output = `
  ${chalk.bold.underline('Steps to Get Started:')}
  
    Navigate to your project folder:
    ${color.command(`$ cd ${projectName.split(' ').length > 1 ? `"${projectName}"` : `${projectName}`}`)}
  
    ${color.emphasis('Make your changes in the')} ${color.file('src/app.js')} ${color.emphasis('file')}.
  
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
    }

    -2- Deploy your iApp on the iExec protocol:
    ${color.command('$ iapp deploy')}
  
    -3- Ask an iExec worker to run your confidential iApp:
    ${color.command('$ iapp run <iapp-address>')}
  `;

    spinner.log(
      boxen(output, {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
      })
    );
  } catch (error) {
    handleCliError({ spinner, error });
  }
}
