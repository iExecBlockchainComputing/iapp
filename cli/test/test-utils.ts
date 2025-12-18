import { render } from 'cli-testing-library';
import assert from 'node:assert';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { SuiteContext, TestContext } from 'node:test';

export const IAPP_COMMAND = 'iapp';

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const date = Date.now();
let testIndex = 0;

export const createTestDir = async (t: TestContext | SuiteContext) => {
  // create a unique test directory for each test
  const testDir = join(
    process.cwd(),
    'test',
    'out',
    `${date} ${testIndex++} ${t.name}`
  );
  await mkdir(testDir, { recursive: true });
  return testDir;
};

export const removeTestDir = async (testDir: string) => {
  await rm(testDir, { recursive: true, force: true });
};

export const retry = <T>(
  fn: () => Promise<T>,
  { retries = 3, delay = 1000 }: { retries?: number; delay?: number } = {}
): Promise<T> => {
  return fn().catch((error) => {
    if (retries <= 0) {
      throw error;
    }
    return sleep(delay).then(() => retry(fn, { retries: retries - 1, delay }));
  });
};

export const initIappProject = async ({
  testDir,
  projectName,
  template = 'JavaScript',
  projectType = 'Hello World',
}: {
  testDir: string;
  projectName: string;
  template: 'JavaScript' | 'Python3.13';
  projectType: 'Hello World' | 'Advanced';
}) => {
  const { findByText, userEvent } = await render(IAPP_COMMAND, ['init'], {
    cwd: testDir,
  });
  await findByText("What's your project name?");
  userEvent.keyboard(`${projectName}[Enter]`);
  await findByText('Which language do you want to use?');
  if (template === 'JavaScript') {
    userEvent.keyboard('[Enter]');
  } else if (template === 'Python3.13') {
    userEvent.keyboard('[ArrowDown]');
    userEvent.keyboard('[Enter]');
  }
  await findByText('What kind of project do you want to init?');
  if (projectType === 'Hello World') {
    userEvent.keyboard('[Enter]');
  } else if (projectType === 'Advanced') {
    userEvent.keyboard('[ArrowDown]');
    userEvent.keyboard('[Enter]');
    await findByText('Would you like to use args inside your iApp?');
    userEvent.keyboard('y');
    await findByText('Would you like to use input files inside your iApp?');
    userEvent.keyboard('y');
    await findByText(
      'Would you like to use requester secrets inside your iApp?'
    );
    userEvent.keyboard('y');
    await findByText('Would you like to use protected data inside your iApp?');
    userEvent.keyboard('[ArrowDown]');
    // userEvent.keyboard('[ArrowDown]'); // to select bulk
    userEvent.keyboard('[Enter]');
    await findByText('Would you like to use an app secret inside your iApp?');
    userEvent.keyboard('y');
  }
  await findByText('Steps to Get Started:');
};

export const checkDockerImageContent = async ({
  dockerImageId,
  expectedFiles,
}: {
  dockerImageId: string;
  expectedFiles: string[];
}) => {
  const { findByText, getStdallStr } = await render('docker', [
    'run',
    '--rm',
    '--entrypoint=ls',
    dockerImageId,
  ]);
  await findByText(expectedFiles[expectedFiles.length - 1]); // wait for latest expected file
  const output = getStdallStr();
  const expectedOutput = expectedFiles.join('\n');
  assert(
    output === expectedOutput,
    `Docker image content does not match expected files
  - Expected:
${expectedOutput}
  - Got:
${output}`
  );
};
