#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { init } from './cmd/init.js';
import { deploy } from './cmd/deploy.js';
import { run } from './cmd/run.js';
import { test } from './cmd/test.js';

// define common options
const options = {
  args: [
    'args',
    {
      describe: `Arguments that will be accessible into the iApp. Spaces separates arguments, use quotes to group arguments (Ex: \`--args '"foo bar" baz'\` will interpret "foo bar" as first arg, "bar" as second arg)`,
      type: 'string',
      demandOption: false,
    },
  ],
  protectedData: [
    'protectedData',
    {
      describe: 'Specify the protected data address',
      type: 'string',
      default: null, // Set default to null or undefined to make it optional
    },
  ],
  inputFile: [
    'inputFile',
    {
      describe:
        'Specify one or multiple input files (publicly-accessible URLs). Input files are accessible to the iApp as local files using path specified in environment variables (Ex: `--inputFile https://foo.com/fileA.txt https://bar.io/fileB.json` will download the file at "https://foo.com/fileA.txt" and make it available for the iApp at `$IEXEC_IN/$IEXEC_INPUT_FILE_NAME_1`, same for "https://bar.io/fileB.json" at `$IEXEC_IN/$IEXEC_INPUT_FILE_NAME_2`)',
      type: 'string',
      requiresArg: true, // must be invoked with a value
    },
  ],
  requesterSecret: [
    'requesterSecret',
    {
      describe:
        'Specify one or multiple key-value requester secrets to use (syntax secretIndex=value)\n`secretIndex` must be strictly positive integer',
      type: 'string',
      requiresArg: true, // must be invoked with a value
      coerce: (values) => {
        // create Array<{key: number, value: string}> from the values Array<string>
        const secrets = values.reduce((acc, curr) => {
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
        }, []);
        return secrets;
      },
    },
  ],
};

const yargsInstance = yargs(hideBin(process.argv));

yargsInstance
  .locale('en') // set local to American English (no i18n)
  .scriptName('iapp')
  .usage('$0 <cmd> [args]')

  // Initialize command
  .command('init', 'Initialize your app structure', () => {}, init)

  // Test command
  .command(
    'test',
    'Test your app',
    (yargs) => {
      return yargs
        .option(...options.args)
        .option(...options.inputFile)
        .array(options.inputFile[0])
        .option(...options.requesterSecret)
        .array(options.requesterSecret[0]);
    },
    test
  )

  // Build and publish docker image
  .command(
    'deploy',
    'Transform you app into a TEE app and deploy it on iExec',
    deploy
  )

  // Run a published docker image
  .command(
    'run <iAppAddress>',
    'Run your iApp',
    (yargs) => {
      return yargs
        .positional('iAppAddress', {
          describe: 'The iApp address to run',
          type: 'string',
        })
        .option(...options.args)
        .option(...options.protectedData)
        .option(...options.inputFile)
        .array(options.inputFile[0])
        .option(...options.requesterSecret)
        .array(options.requesterSecret[0]);
    },
    run
  )

  .help()
  .alias('help', 'h')
  .alias('version', 'v')
  .wrap(yargsInstance.terminalWidth()) // use full terminal size rather than default 80
  .parse();
