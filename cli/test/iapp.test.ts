import { test, beforeEach, after, afterEach, describe } from 'node:test';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { render, cleanup } from 'cli-testing-library';
import {
  IAPP_COMMAND,
  initIappProject,
  checkDockerImageContent,
  createTestDir,
  removeTestDir,
  retry,
} from './test-utils.ts';

// Final cleanup code after all tests
after(async () => {
  await cleanup();
});

/**
 * test directory
 */
let testDir: string;

beforeEach(async (t) => {
  // create a unique test directory for each test
  testDir = await createTestDir(t);
});

afterEach(async () => {
  // remove test directory after each test
  // comment the line below to keep the test directories for debugging
  await removeTestDir(testDir);
});

test('iapp help command works', async () => {
  const { findByText, debug, clear } = await render(IAPP_COMMAND, ['help'], {
    cwd: testDir,
  });
  await findByText('iapp <cmd> [args]');
  // debug();
  clear();
});

test('iapp -v command works', async () => {
  const { findByText, debug, clear } = await render(IAPP_COMMAND, ['-v'], {
    cwd: testDir,
  });
  await findByText('1.3.3');
  // debug();
  clear();
});

test('iapp init command works', async () => {
  const { findByText, clear, debug, userEvent } = await render(
    IAPP_COMMAND,
    ['init'],
    {
      cwd: testDir,
    }
  );
  await findByText("What's your project name?");
  // debug();
  clear();
  userEvent.keyboard('[Enter]');
  await findByText('Which language do you want to use?');
  // debug();
  clear();
  userEvent.keyboard('[Enter]');
  await findByText('What kind of project do you want to init?');
  // debug();
  clear();
  userEvent.keyboard('[Enter]');
  await findByText('Steps to Get Started:');
  // debug();
  clear();
});

describe('JavaScript iApp', () => {
  describe('Hello World', () => {
    describe('iapp test', () => {
      const projectName = 'test-iapp';

      // Initialize a test iApp project before each test
      beforeEach(async () => {
        await initIappProject({
          testDir,
          projectName,
          template: 'JavaScript',
          projectType: 'Hello World',
        });
      });

      test('iapp test command works', async () => {
        const { findByText, debug, clear, userEvent, getStdallStr } =
          await render(IAPP_COMMAND, ['test'], {
            cwd: join(testDir, projectName),
          });
        // wait for docker build and test run
        await retry(() => findByText('Would you like to see the app logs?'), {
          retries: 8,
          delay: 3000,
        });
        // extract docker image id from stdout
        const std = getStdallStr();
        const dockerImageIdMatch = std.match(
          /App docker image built \(sha256:[a-f0-9]{64}\)/
        );
        assert.ok(dockerImageIdMatch, 'Docker image ID not found in output');
        const dockerImageId = dockerImageIdMatch![0].split('(')[1].slice(0, -1);

        // debug();
        clear();
        userEvent.keyboard('n');
        await findByText('Would you like to see the result?');
        // debug();
        clear();
        userEvent.keyboard('n');
        await findByText('When ready run iapp deploy');
        // debug();
        clear();

        // check built docker image content
        await checkDockerImageContent({
          dockerImageId,
          expectedFiles: [
            'Dockerfile',
            'README.md',
            'node_modules',
            'package-lock.json',
            'package.json',
            'src',
          ],
        });
      });
    });
  });

  describe('Advanced', () => {
    describe('iapp test', () => {
      const projectName = 'test-iapp';

      // Initialize a test iApp project before each test
      beforeEach(async () => {
        await initIappProject({
          testDir,
          projectName,
          template: 'JavaScript',
          projectType: 'Advanced',
        });
      });

      test('iapp test command works', async () => {
        const { findByText, debug, clear, userEvent, getStdallStr } =
          await render(IAPP_COMMAND, ['test'], {
            cwd: join(testDir, projectName),
          });
        await findByText('Do you want to attach an app secret to your iApp?');
        userEvent.keyboard('y');
        // debug()
        clear();
        await findByText('What is the app secret?');
        userEvent.keyboard('mySuperSecretAppSecret[Enter]');
        // debug()
        clear();
        await findByText('Do you want to save this app secret to your config?');
        userEvent.keyboard('y');
        // debug()
        clear();
        // wait for docker build and test run
        await retry(() => findByText('Would you like to see the app logs?'), {
          retries: 8,
          delay: 3000,
        });
        // extract docker image id from stdout
        const std = getStdallStr();
        const dockerImageIdMatch = std.match(
          /App docker image built \(sha256:[a-f0-9]{64}\)/
        );
        assert.ok(dockerImageIdMatch, 'Docker image ID not found in output');
        const dockerImageId = dockerImageIdMatch![0].split('(')[1].slice(0, -1);

        // debug();
        clear();
        userEvent.keyboard('n');
        await findByText('Would you like to see the result?');
        // debug();
        clear();
        userEvent.keyboard('n');
        await findByText('When ready run iapp deploy');
        // debug();
        clear();

        // check built docker image content
        await checkDockerImageContent({
          dockerImageId,
          expectedFiles: [
            'Dockerfile',
            'README.md',
            'node_modules',
            'package-lock.json',
            'package.json',
            'src',
          ],
        });
      });
    });
  });
});

describe('Python iApp', () => {
  describe('Hello World', () => {
    describe('iapp test', () => {
      const projectName = 'test-iapp';

      // Initialize a test iApp project before each test
      beforeEach(async () => {
        await initIappProject({
          testDir,
          projectName,
          template: 'Python3.13',
          projectType: 'Hello World',
        });
      });

      test('iapp test command works', async () => {
        const { findByText, debug, clear, userEvent, getStdallStr } =
          await render(IAPP_COMMAND, ['test'], {
            cwd: join(testDir, projectName),
          });
        // wait for docker build and test run
        await retry(() => findByText('Would you like to see the app logs?'), {
          retries: 8,
          delay: 3000,
        });
        // extract docker image id from stdout
        const std = getStdallStr();
        const dockerImageIdMatch = std.match(
          /App docker image built \(sha256:[a-f0-9]{64}\)/
        );
        assert.ok(dockerImageIdMatch, 'Docker image ID not found in output');
        const dockerImageId = dockerImageIdMatch![0].split('(')[1].slice(0, -1);

        // debug();
        clear();
        userEvent.keyboard('n');
        await findByText('Would you like to see the result?');
        // debug();
        clear();
        userEvent.keyboard('n');
        await findByText('When ready run iapp deploy');
        // debug();
        clear();

        // check built docker image content
        await checkDockerImageContent({
          dockerImageId,
          expectedFiles: ['Dockerfile', 'README.md', 'requirements.txt', 'src'],
        });
      });
    });
  });

  describe('Advanced', () => {
    describe('iapp test', () => {
      const projectName = 'test-iapp';

      // Initialize a test iApp project before each test
      beforeEach(async () => {
        await initIappProject({
          testDir,
          projectName,
          template: 'Python3.13',
          projectType: 'Advanced',
        });
      });

      test('iapp test command works', async () => {
        const { findByText, debug, clear, userEvent, getStdallStr } =
          await render(IAPP_COMMAND, ['test'], {
            cwd: join(testDir, projectName),
          });
        await findByText('Do you want to attach an app secret to your iApp?');
        userEvent.keyboard('y');
        // debug()
        clear();
        await findByText('What is the app secret?');
        userEvent.keyboard('mySuperSecretAppSecret[Enter]');
        // debug()
        clear();
        await findByText('Do you want to save this app secret to your config?');
        userEvent.keyboard('y');
        // debug()
        clear();
        // wait for docker build and test run
        await retry(() => findByText('Would you like to see the app logs?'), {
          retries: 8,
          delay: 3000,
        });
        // extract docker image id from stdout
        const std = getStdallStr();
        const dockerImageIdMatch = std.match(
          /App docker image built \(sha256:[a-f0-9]{64}\)/
        );
        assert.ok(dockerImageIdMatch, 'Docker image ID not found in output');
        const dockerImageId = dockerImageIdMatch![0].split('(')[1].slice(0, -1);

        // debug();
        clear();
        userEvent.keyboard('n');
        await findByText('Would you like to see the result?');
        // debug();
        clear();
        userEvent.keyboard('n');
        await findByText('When ready run iapp deploy');
        // debug();
        clear();

        // check built docker image content
        await checkDockerImageContent({
          dockerImageId,
          expectedFiles: ['Dockerfile', 'README.md', 'requirements.txt', 'src'],
        });
      });
    });
  });
});
