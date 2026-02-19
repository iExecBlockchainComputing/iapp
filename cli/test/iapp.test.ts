import { test, beforeEach, after, afterEach, describe } from 'node:test';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';
import { render, cleanup } from 'cli-testing-library';
import {
  IAPP_COMMAND,
  initIappProject,
  checkDockerImageContent,
  createTestDir,
  removeTestDir,
  retry,
  readIAppConfig,
} from './test-utils.ts';
import { fileURLToPath } from 'node:url';
import { readFile, rm, writeFile } from 'node:fs/promises';

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
  // comment the line below to keep the test directories for ging
  await removeTestDir(testDir);
});

test('iapp help command works', async () => {
  const { findByText, clear } = await render(IAPP_COMMAND, ['help'], {
    cwd: testDir,
  });
  await findByText('iapp <cmd> [args]');
  clear();
});

test('iapp -v command works', async () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const packageJson = JSON.parse(
    await readFile(join(__dirname, '../package.json'), 'utf-8')
  );
  const { version } = packageJson;

  const { findByText, clear } = await render(IAPP_COMMAND, ['-v'], {
    cwd: testDir,
  });
  await findByText(version);
  clear();
});

test('iapp init command works', async () => {
  const { findByText, clear, userEvent } = await render(
    IAPP_COMMAND,
    ['init'],
    {
      cwd: testDir,
    }
  );
  await findByText("What's your project name?");
  clear();
  userEvent.keyboard('[Enter]');
  await findByText('Which language do you want to use?');
  clear();
  userEvent.keyboard('[Enter]');
  await findByText('What kind of project do you want to init?');
  clear();
  userEvent.keyboard('[Enter]');
  await findByText('Steps to Get Started:');
  clear();

  const config = await readIAppConfig(join(testDir, 'hello-world'));
  // default chain is bellecour
  assert.strictEqual(
    config.defaultChain,
    'arbitrum-sepolia-testnet',
    'defaultChain should be arbitrum-sepolia-testnet'
  );
  // default project name is hello-world
  assert.strictEqual(
    config.projectName,
    'hello-world',
    'projectName should be hello-world'
  );
  // default template is JavaScript
  assert.strictEqual(
    config.template,
    'JavaScript',
    'template should be JavaScript'
  );
  // default app secret is disabled
  assert.strictEqual(config.appSecret, null, 'appSecret should be null');
  // default wallet private key is set
  assert(config.walletPrivateKey, 'walletPrivateKey should be set');
});

describe('iapp chain select', () => {
  const projectName = 'test-iapp';
  beforeEach(async () => {
    await initIappProject({
      testDir,
      projectName,
      template: 'JavaScript',
      projectType: 'Hello World',
    });
  });

  test('select bellecour works', async () => {
    await render(IAPP_COMMAND, ['chain select bellecour'], {
      cwd: join(testDir, projectName),
    });
    await retry(
      async () => {
        const config = await readIAppConfig(join(testDir, projectName));
        assert.strictEqual(config.defaultChain, 'bellecour');
      },
      {
        retries: 10,
        delay: 100,
      }
    );
  });

  test('select arbitrum-sepolia-testnet works', async () => {
    await render(IAPP_COMMAND, ['chain select arbitrum-sepolia-testnet'], {
      cwd: join(testDir, projectName),
    });
    await retry(
      async () => {
        const config = await readIAppConfig(join(testDir, projectName));
        assert.strictEqual(config.defaultChain, 'arbitrum-sepolia-testnet');
      },
      {
        retries: 10,
        delay: 100,
      }
    );
  });

  test('select arbitrum-mainnet works', async () => {
    await render(IAPP_COMMAND, ['chain select arbitrum-mainnet'], {
      cwd: join(testDir, projectName),
    });
    await retry(
      async () => {
        const config = await readIAppConfig(join(testDir, projectName));
        assert.strictEqual(config.defaultChain, 'arbitrum-mainnet');
      },
      {
        retries: 10,
        delay: 100,
      }
    );
  });
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
        const { findByText, clear, userEvent, getStdallStr } = await render(
          IAPP_COMMAND,
          ['test'],
          {
            cwd: join(testDir, projectName),
          }
        );
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
        clear();
        userEvent.keyboard('n');
        await findByText('Would you like to see the result?');
        clear();
        userEvent.keyboard('n');
        await findByText('When ready run iapp deploy');
        clear();

        // check built docker image content
        await checkDockerImageContent({
          dockerImageId,
          expectedFiles: [
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
        const { findByText, clear, userEvent, getStdallStr } = await render(
          IAPP_COMMAND,
          ['test'],
          {
            cwd: join(testDir, projectName),
          }
        );
        await findByText('Do you want to attach an app secret to your iApp?');
        userEvent.keyboard('y');
        // )
        clear();
        await findByText('What is the app secret?');
        userEvent.keyboard('mySuperSecretAppSecret[Enter]');
        // )
        clear();
        await findByText('Do you want to save this app secret to your config?');
        userEvent.keyboard('y');
        // )
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
        clear();
        userEvent.keyboard('n');
        await findByText('Would you like to see the result?');
        clear();
        userEvent.keyboard('n');
        await findByText('When ready run iapp deploy');
        clear();

        // check built docker image content
        await checkDockerImageContent({
          dockerImageId,
          expectedFiles: [
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
        const { findByText, clear, userEvent, getStdallStr } = await render(
          IAPP_COMMAND,
          ['test'],
          {
            cwd: join(testDir, projectName),
          }
        );
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
        clear();
        userEvent.keyboard('n');
        await findByText('Would you like to see the result?');
        clear();
        userEvent.keyboard('n');
        await findByText('When ready run iapp deploy');
        clear();

        // check built docker image content
        await checkDockerImageContent({
          dockerImageId,
          expectedFiles: ['requirements.txt', 'src'],
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
        const { findByText, clear, userEvent, getStdallStr } = await render(
          IAPP_COMMAND,
          ['test'],
          {
            cwd: join(testDir, projectName),
          }
        );
        await findByText('Do you want to attach an app secret to your iApp?');
        userEvent.keyboard('y');
        // )
        clear();
        await findByText('What is the app secret?');
        userEvent.keyboard('mySuperSecretAppSecret[Enter]');
        // )
        clear();
        await findByText('Do you want to save this app secret to your config?');
        userEvent.keyboard('y');
        // )
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
        clear();
        userEvent.keyboard('n');
        await findByText('Would you like to see the result?');
        clear();
        userEvent.keyboard('n');
        await findByText('When ready run iapp deploy');
        clear();

        // check built docker image content
        await checkDockerImageContent({
          dockerImageId,
          expectedFiles: ['requirements.txt', 'src'],
        });
      });
    });
  });
});

describe('Custom app', () => {
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
      // removed .dockerignore
      await rm(join(testDir, projectName, '.dockerignore'));
      // changed Dockerfile to a custom one
      const dockerfileContent = await readFile(
        join(testDir, projectName, 'Dockerfile'),
        'utf-8'
      );
      const customDockerfileContent = dockerfileContent.replace(
        'COPY src/ ./src/',
        'COPY . ./'
      );
      await writeFile(
        join(testDir, projectName, 'Dockerfile'),
        customDockerfileContent,
        'utf-8'
      );

      const { findByText, clear, userEvent, getStdallStr } = await render(
        IAPP_COMMAND,
        ['test'],
        {
          cwd: join(testDir, projectName),
        }
      );
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
      clear();
      userEvent.keyboard('n');
      await findByText('Would you like to see the result?');
      clear();
      userEvent.keyboard('n');
      await findByText('When ready run iapp deploy');
      clear();

      // check built docker image content
      await checkDockerImageContent({
        dockerImageId,
        expectedFiles: [
          'Dockerfile',
          'README.md',
          'cache',
          'input',
          'mock',
          'node_modules',
          'output',
          'package-lock.json',
          'package.json',
          'src',
        ],
      });
    });
  });
});
