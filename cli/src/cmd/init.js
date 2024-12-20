import chalk from 'chalk';
import boxen from 'boxen';
import figlet from 'figlet';
import { mkdir } from 'node:fs/promises';
import { folderExists } from '../utils/fs.utils.js';
import { setUpFramework } from '../utils/setUpFramework.js';
import { getSpinner } from '../cli-helpers/spinner.js';
import { handleCliError } from '../cli-helpers/handleCliError.js';
import { generateWallet } from '../utils/generateWallet.js';

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
      message:
        "What's your project name? (A folder with this name will be created)",
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
            message: 'Would you like to use positional args inside your iApp?',
            initial: true,
          },
          {
            type: 'confirm',
            name: 'useProtectedData',
            message:
              'Would you like to use a protected data inside your iApp?',
            initial: false,
          },
          {
            type: 'confirm',
            name: 'useInputFile',
            message:
              'Would you like to use input files inside your iApp? (input files are files downloaded from the internet)',
            initial: false,
          },
          {
            type: 'confirm',
            name: 'useRequesterSecret',
            message:
              'Would you like to use requester secrets inside your iApp? (requester secrets are secrets that will be provided by any users that will run your iApp)',
            initial: false,
          },
          {
            type: 'confirm',
            name: 'useAppSecret',
            message:
              'Would you like to use an app secret inside your iApp? (app secret is an immutable secret provisioned once by the iApp owner)',
            initial: false,
          },
        ])
      : {}; // default

    await mkdir(projectName);
    process.chdir(projectName);

    // Copying JavaScript simple project files from templates/

    spinner.start('Creating "Hello World" JavaScript app...');
    await setUpFramework({
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
    ${chalk.yellow(`$ cd ${projectName.split(' ').length > 1 ? `"${projectName}"` : `${projectName}`}`)}
  
    ${chalk.green('Make your changes in the')} ${chalk.cyan('src/app.js')} ${chalk.green('file')}.
  
    -1- Test your iApp locally:
    ${chalk.yellow('$ iapp test')}
    ${chalk.yellow('$ iapp test --args your-name')}
  
    -2- Deploy your iApp on the iExec protocol:
    ${chalk.yellow('$ iapp deploy')}
  
    -3- Ask an iExec worker to run your confidential iApp:
    ${chalk.yellow('$ iapp run <iapp-address>')}
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
