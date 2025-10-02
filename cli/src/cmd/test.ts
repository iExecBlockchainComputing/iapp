import Parser from 'yargs-parser';
import { rm, mkdir, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { hexlify, randomBytes } from 'ethers';
import {
  checkDockerDaemon,
  dockerBuild,
  runDockerContainer,
} from '../execDocker/docker.js';
import { checkDeterministicOutputExists } from '../utils/deterministicOutput.js';
import {
  IEXEC_WORKER_HEAP_SIZE,
  IEXEC_RESULT_UPLOAD_MAX_SIZE,
  PROTECTED_DATA_MOCK_DIR,
  TASK_OBSERVATION_TIMEOUT,
  TEST_INPUT_DIR,
  TEST_OUTPUT_DIR,
} from '../config/config.js';
import { getSpinner, type Spinner } from '../cli-helpers/spinner.js';
import { handleCliError } from '../cli-helpers/handleCliError.js';
import { prepareInputFile } from '../utils/prepareInputFile.js';
import { askForAppSecret } from '../cli-helpers/askForAppSecret.js';
import { askShowResult } from '../cli-helpers/askShowResult.js';
import { copy, fileExists } from '../utils/fs.utils.js';
import { goToProjectRoot } from '../cli-helpers/goToProjectRoot.js';
import * as color from '../cli-helpers/color.js';
import { hintBox } from '../cli-helpers/box.js';
import { useTdx } from '../utils/featureFlags.js';
import { IEXEC_TDX_WORKER_HEAP_SIZE } from '../utils/tdx-poc.js';

export async function test({
  args,
  protectedData: protectedDataMocks,
  inputFile: inputFiles = [], // rename variable (it's an array)
  requesterSecret: requesterSecrets = [], // rename variable (it's an array)
}: {
  args?: string;
  protectedData?: string[];
  inputFile?: string[];
  requesterSecret?: { key: number; value: string }[];
}) {
  const spinner = getSpinner();
  try {
    await goToProjectRoot({ spinner });
    await cleanTestInput({ spinner });
    await cleanTestOutput({ spinner });
    await testApp({
      args,
      inputFiles,
      requesterSecrets,
      spinner,
      protectedDataMocks: protectedDataMocks
        ? protectedDataMocks.length > 0
          ? protectedDataMocks
          : ['default']
        : [],
    });
    await checkTestOutput({ spinner });
    await askShowResult({ spinner, outputPath: TEST_OUTPUT_DIR });
    // TODO: check test warnings and errors and adapt the message
    spinner.log(
      hintBox(
        `When ready run ${color.command(`iapp deploy`)} to transform you app into a TEE app and deploy it on iExec`
      )
    );
  } catch (error) {
    handleCliError({ spinner, error });
  }
}

async function cleanTestInput({ spinner }: { spinner: Spinner }) {
  // just start the spinner, no need to persist success in terminal
  spinner.start('Cleaning input directory...');
  await rm(TEST_INPUT_DIR, { recursive: true, force: true });
  await mkdir(TEST_INPUT_DIR);
  spinner.reset();
}

async function cleanTestOutput({ spinner }: { spinner: Spinner }) {
  // just start the spinner, no need to persist success in terminal
  spinner.start('Cleaning output directory...');
  await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(TEST_OUTPUT_DIR);
  spinner.reset();
}

function parseArgsString(args = '') {
  // tokenize args with yargs-parser
  const { _ } = Parser(args, {
    configuration: {
      'unknown-options-as-args': true,
    },
  });
  // avoid numbers
  const stringify = (arg: string | number) => `${arg}`;
  // strip surrounding quotes of tokenized args
  const stripSurroundingQuotes = (arg: string) => {
    if (
      (arg.startsWith('"') && arg.endsWith('"')) ||
      (arg.startsWith("'") && arg.endsWith("'"))
    ) {
      return arg.substring(1, arg.length - 1);
    }
    return arg;
  };
  return _.map(stringify).map(stripSurroundingQuotes);
}

export async function testApp({
  spinner,
  args = undefined,
  inputFiles = [],
  requesterSecrets = [],
  protectedDataMocks = [],
}: {
  spinner: Spinner;
  args?: string;
  inputFiles?: string[];
  requesterSecrets?: { key: number; value: string }[];
  protectedDataMocks?: string[];
}) {
  const appSecret = await askForAppSecret({ spinner });

  // just start the spinner, no need to persist success in terminal
  spinner.start('Checking docker daemon is running...');
  await checkDockerDaemon();
  // build a temp image for test
  spinner.start('Building app docker image for test...\n');
  const imageId = await dockerBuild({
    isForTest: true,
    progressCallback: (msg) => {
      spinner.text = spinner.text + color.comment(msg);
    },
  });
  spinner.succeed(`App docker image built (${imageId})`);

  let PROTECTED_DATA_MOCK_NAMES: string[] = [];

  if (protectedDataMocks?.length > 0) {
    if (protectedDataMocks.length > 1) {
      spinner.info('Using protectedData bulk processing');
    }
    spinner.start(`Loading protectedData mocks...\n`);
    PROTECTED_DATA_MOCK_NAMES = await Promise.all(
      protectedDataMocks.map(async (protectedDataMock, i) => {
        spinner.text += ` - "${protectedDataMock}"\n`;
        const fileName = `protectedDataMock_${i + 1}`;
        const protectedDataMockPath = join(
          PROTECTED_DATA_MOCK_DIR,
          protectedDataMock
        );
        const mockExists = await fileExists(protectedDataMockPath);
        if (!mockExists) {
          throw Error(
            `No protectedData mock "${protectedDataMock}" found in ${PROTECTED_DATA_MOCK_DIR}, run ${color.command('iapp mock protectedData')} to create a new protectedData mock`
          );
        }
        await copy(join(protectedDataMockPath), join(TEST_INPUT_DIR, fileName));
        return fileName;
      })
    );
    spinner.succeed(
      `${protectedDataMocks.length} protectedData mocks loaded for test`
    );
  }

  let inputFilesPath: string[] = [];
  if (inputFiles.length > 0) {
    spinner.start('Preparing input files...\n');
    inputFilesPath = await Promise.all(
      inputFiles.map((url) => prepareInputFile(url))
    );
    spinner.succeed('Input files prepared for test');
  }

  // run the temp image
  spinner.start('Running app docker image...\n');
  const taskTimeoutWarning = setTimeout(() => {
    const spinnerText = spinner.text;
    spinner.warn('Task is taking longer than expected...');
    spinner.start(spinnerText); // restart spinning
  }, TASK_OBSERVATION_TIMEOUT);
  const memoryLimit = useTdx
    ? IEXEC_TDX_WORKER_HEAP_SIZE
    : IEXEC_WORKER_HEAP_SIZE;
  const appLogs: string[] = [];
  const { exitCode, outOfMemory } = await runDockerContainer({
    image: imageId,
    cmd: parseArgsString(args), // args https://protocol.docs.iex.ec/for-developers/technical-references/application-io#args
    volumes: [
      `${process.cwd()}/${TEST_INPUT_DIR}:/iexec_in`,
      `${process.cwd()}/${TEST_OUTPUT_DIR}:/iexec_out`,
    ],
    env: [
      `IEXEC_IN=/iexec_in`,
      `IEXEC_OUT=/iexec_out`,
      // simulate a task id
      `IEXEC_TASK_ID=${hexlify(randomBytes(32))}`,
      // dataset env https://protocol.docs.iex.ec/for-developers/technical-references/application-io#dataset
      ...(PROTECTED_DATA_MOCK_NAMES.length === 1
        ? [`IEXEC_DATASET_FILENAME=${PROTECTED_DATA_MOCK_NAMES[0]}`]
        : []),
      // dataset bulk processing env
      ...(PROTECTED_DATA_MOCK_NAMES.length > 1
        ? PROTECTED_DATA_MOCK_NAMES.map(
            (name, index) => `BULK_DATASET_${index + 1}_FILENAME=${name}`
          ).concat([`BULK_SLICE_SIZE=${PROTECTED_DATA_MOCK_NAMES.length}`])
        : [`BULK_SLICE_SIZE=0`]),
      // input files env https://protocol.docs.iex.ec/for-developers/technical-references/application-io#input-files
      `IEXEC_INPUT_FILES_NUMBER=${inputFilesPath?.length || 0}`,
      ...(inputFilesPath?.length > 0
        ? inputFilesPath.map(
            (inputFilePath, index) =>
              `IEXEC_INPUT_FILE_NAME_${index + 1}=${inputFilePath}`
          )
        : []),
      // requester secrets https://protocol.docs.iex.ec/for-developers/technical-references/application-io#requester-secrets
      ...(requesterSecrets?.length > 0
        ? requesterSecrets.map(
            ({ key, value }) => `IEXEC_REQUESTER_SECRET_${key}=${value}`
          )
        : []),
      // app secret https://protocol.docs.iex.ec/for-developers/technical-references/application-io#app-developer-secret
      ...(appSecret !== null
        ? [`IEXEC_APP_DEVELOPER_SECRET=${appSecret}`]
        : []),
    ],
    memory: memoryLimit,
    logsCallback: (msg) => {
      appLogs.push(msg); // collect logs for future use
      spinner.text = spinner.text + color.comment(msg); // and display realtime while app is running
    },
  }).finally(() => {
    clearTimeout(taskTimeoutWarning);
  });
  if (outOfMemory) {
    spinner.fail(
      `App docker image container ran out of memory.
  iExec worker's ${Math.floor(memoryLimit / (1024 * 1024))}MiB memory limit exceeded.
  You must refactor your app to run within the memory limit.`
    );
  } else if (exitCode === 0) {
    spinner.succeed('App docker image ran and exited successfully.');
  } else {
    spinner.fail(
      `App docker image ran but exited with error (Exit code: ${exitCode})`
    );
  }
  // show app logs
  if (appLogs.length === 0) {
    spinner.info("App didn't log anything");
  } else {
    const showLogs = await spinner.prompt({
      type: 'confirm',
      name: 'continue',
      message: `Would you like to see the app logs? ${color.promptHelper(`(${appLogs.length} lines)`)}`,
      initial: false,
    });
    if (showLogs.continue) {
      spinner.info(`App logs:
${appLogs.join('')}`);
    }
  }
}

async function getDirectorySize(directoryPath: string) {
  let totalSize = 0;
  const files = await readdir(directoryPath);
  for (const file of files) {
    const filePath = join(directoryPath, file);
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      totalSize += await getDirectorySize(filePath);
    } else {
      totalSize += stats.size;
    }
  }
  return totalSize;
}

async function checkTestOutput({ spinner }: { spinner: Spinner }) {
  spinner.start('Checking test output...');
  const errors = [];
  await checkDeterministicOutputExists({ outputPath: TEST_OUTPUT_DIR }).catch(
    (e) => {
      errors.push(e);
    }
  );
  const outputDirSize = await getDirectorySize(TEST_OUTPUT_DIR);
  if (outputDirSize > IEXEC_RESULT_UPLOAD_MAX_SIZE) {
    errors.push(
      new Error(
        `Output directory size exceeds the maximum limit of ${IEXEC_RESULT_UPLOAD_MAX_SIZE / (1024 * 1024)} MiB (actual size: ${outputDirSize / (1024 * 1024)} MiB)`
      )
    );
  }
  if (errors.length === 0) {
    spinner.succeed('Checked app output');
  } else {
    errors.forEach((e) => {
      spinner.fail(e.message);
    });
  }
}
