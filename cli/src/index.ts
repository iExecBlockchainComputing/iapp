#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { init } from './cmd/init.js';
import { deploy } from './cmd/deploy.js';
import { run } from './cmd/run.js';
import { test } from './cmd/test.js';
import { mockProtectedData } from './cmd/mock-protected-data.js';
import { debug } from './cmd/debug.js';
import { SUPPORTED_CHAINS } from './config/config.js';
import { checkPackageUpdate } from './cli-helpers/checkPackageUpdate.js';
import { walletImport } from './cmd/wallet-import.js';
import { walletSelect } from './cmd/wallet-select.js';

await checkPackageUpdate();

const coerceRequesterSecret = (
  values: string[]
): { key: number; value: string }[] => {
  // create Array<{key: number, value: string}> from the values Array<string>
  const secrets = values.reduce(
    (acc, curr) => {
      const separatorIndex = curr.indexOf('=');
      const key = Number(curr.slice(0, separatorIndex));
      const value = curr.slice(separatorIndex + 1);
      if (!Number.isInteger(key) || key < 1) {
        throw Error(
          `invalid secret index ${key} in requesterSecret \`${curr}\``
        );
      }
      if (value === undefined) {
        throw Error(
          `invalid secret value ${value} in requesterSecret \`${curr}\``
        );
      }
      return [...acc, { key, value }];
    },
    [] as { key: number; value: string }[]
  );
  return secrets;
};

const yargsInstance = yargs(hideBin(process.argv));

yargsInstance
  .locale('en') // set local to American English (no i18n)
  .scriptName('iapp')
  .usage('$0 <cmd> [args]')

  // Initialize command
  .command('init', 'Initialize your app structure', () => {}, init)

  // Test command
  .command({
    command: 'test',
    describe: 'Test your app',
    builder: (y) => {
      return y
        .option('args', {
          describe: `Arguments that will be accessible into the iApp. Spaces separates arguments, use quotes to group arguments (Ex: \`--args '"foo bar" baz'\` will interpret "foo bar" as first arg, "bar" as second arg)`,
          type: 'string',
        })
        .option('protectedData', {
          describe:
            'Specify the protected data mock name (use "default" protected data mock or create custom mocks with `iapp mock protectedData`) ',
          type: 'string',
        })
        .option('inputFile', {
          describe:
            'Specify one or multiple input files (publicly-accessible URLs). Input files are accessible to the iApp as local files using path specified in environment variables (Ex: `--inputFile https://foo.com/fileA.txt https://bar.io/fileB.json` will download the file at "https://foo.com/fileA.txt" and make it available for the iApp at `$IEXEC_IN/$IEXEC_INPUT_FILE_NAME_1`, same for "https://bar.io/fileB.json" at `$IEXEC_IN/$IEXEC_INPUT_FILE_NAME_2`)',
          type: 'string',
          requiresArg: true, // must be invoked with a value
          array: true,
        })
        .option('requesterSecret', {
          describe:
            'Specify one or multiple key-value requester secrets. Use syntax `secretIndex=value`, `secretIndex` is a public strictly positive integer, `value` is a secret only available in the iApp (Ex: `--requesterSecret 1=foo 42=bar` will set the following environment variables in iApp `IEXEC_REQUESTER_SECRET_1=foo` and `IEXEC_REQUESTER_SECRET_42=bar`).',
          type: 'string',
          requiresArg: true, // must be invoked with a value
          array: true,
          coerce: coerceRequesterSecret,
        });
    },
    handler: (y) => test(y),
  })

  // Build and publish docker image
  .command({
    command: 'deploy',
    describe: 'Transform you app into a TEE app and deploy it on iExec',
    builder: (y) => {
      return y.option('chain', {
        describe:
          'Specify the blockchain on which the iApp will be deployed (overrides defaultChain configuration)',
        type: 'string',
        choices: SUPPORTED_CHAINS,
      });
    },
    handler: (y) => deploy(y),
  })

  // Run a published docker image
  .command({
    command: 'run <iAppAddress>',
    describe: 'Run your deployed iApp',
    builder: (y) => {
      return y
        .positional('iAppAddress', {
          describe: 'The iApp address to run',
          type: 'string',
          demandOption: true,
        })
        .option('args', {
          describe: `Arguments that will be accessible into the iApp. Spaces separates arguments, use quotes to group arguments (Ex: \`--args '"foo bar" baz'\` will interpret "foo bar" as first arg, "bar" as second arg)`,
          type: 'string',
        })
        .option('protectedData', {
          describe: 'Specify the protected data address',
          type: 'string',
        })
        .option('inputFile', {
          describe:
            'Specify one or multiple input files (publicly-accessible URLs). Input files are accessible to the iApp as local files using path specified in environment variables (Ex: `--inputFile https://foo.com/fileA.txt https://bar.io/fileB.json` will download the file at "https://foo.com/fileA.txt" and make it available for the iApp at `$IEXEC_IN/$IEXEC_INPUT_FILE_NAME_1`, same for "https://bar.io/fileB.json" at `$IEXEC_IN/$IEXEC_INPUT_FILE_NAME_2`)',
          type: 'string',
          requiresArg: true, // must be invoked with a value
          array: true,
        })
        .option('requesterSecret', {
          describe:
            'Specify one or multiple key-value requester secrets. Use syntax `secretIndex=value`, `secretIndex` is a public strictly positive integer, `value` is a secret only available in the iApp (Ex: `--requesterSecret 1=foo 42=bar` will set the following environment variables in iApp `IEXEC_REQUESTER_SECRET_1=foo` and `IEXEC_REQUESTER_SECRET_42=bar`).',
          type: 'string',
          requiresArg: true, // must be invoked with a value
          array: true,
          coerce: coerceRequesterSecret,
        })
        .option('chain', {
          describe:
            'Specify the blockchain on which the iApp is deployed (overrides defaultChain configuration)',
          type: 'string',
          choices: SUPPORTED_CHAINS,
        });
    },
    handler: (y) => run(y),
  })

  .command({
    command: 'debug <taskId>',
    describe:
      'Retrieve detailed execution logs from worker nodes for a specific task',
    builder: (y) => {
      return y
        .positional('taskId', {
          describe: 'Unique identifier of the task to debug',
          type: 'string',
          demandOption: true,
        })
        .option('chain', {
          describe:
            'Specify the blockchain on which the task is registered (overrides defaultChain configuration)',
          type: 'string',
          choices: SUPPORTED_CHAINS,
        });
    },
    handler: (y) => debug(y),
  })

  .command({
    command: 'mock <inputType>',
    describe: 'Create a mocked input for test',
    builder: (y) =>
      y.positional('inputType', {
        describe: 'Type of input to mock',
        choices: ['protectedData'],
      }),
    handler: (y) => {
      if (y.inputType === 'protectedData') {
        return mockProtectedData();
      }
    },
  })

  .command({
    command: 'wallet <action>',
    describe: 'Manage wallet',
    builder: (y) =>
      y.positional('action', {
        describe: 'Import a new wallet or select existing one',
        choices: ['import', 'select'],
      }),
    handler: (y) => {
      if (y.action === 'import') {
        return walletImport();
      }
      if (y.action === 'select') {
        return walletSelect();
      }
    },
  })

  .help()
  .completion('completion', false) // create hidden "completion" command
  .alias('help', 'h')
  .alias('version', 'v')
  .strict() // show help if iapp is invoked with an invalid subcommand
  .demandCommand(1, 'Missing subcommand') // show help if iapp is invoked without subcommand is invoked
  .wrap(yargsInstance.terminalWidth()) // use full terminal size rather than default 80
  .parse();
