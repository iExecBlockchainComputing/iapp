import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONFIG_FILE,
  TEST_INPUT_DIR,
  TEST_OUTPUT_DIR,
  CACHE_DIR,
  PROTECTED_DATA_MOCK_DIR,
} from '../config/config.js';
import { debug } from './debug.js';
import { copy } from './fs.utils.js';

export async function initIAppWorkspace({
  projectName,
  useArgs = false,
  useProtectedData = false,
  useInputFile = false,
  useRequesterSecret = false,
  useAppSecret = false,
}) {
  try {
    // Copy template
    await copyChosenTemplateFiles({
      template: 'js',
      srcFile: 'src/app.js',
      useArgs,
      useProtectedData,
      useInputFile,
      useRequesterSecret,
      useAppSecret,
    });
    // Create other files
    await createConfigurationFiles({
      projectName,
      appSecret: useAppSecret ? undefined : null, // save `appSecret: null` to disable prompt when `useAppSecret: false`
    });
    await createProjectDirectories();
  } catch (err) {
    debug('Error during project initialization:', err);
    throw err;
  }
}

async function createProjectDirectories() {
  await Promise.all([
    fs.mkdir(TEST_INPUT_DIR, { recursive: true }),
    fs.mkdir(TEST_OUTPUT_DIR, { recursive: true }),
    fs.mkdir(CACHE_DIR, { recursive: true }),
  ]);
}

async function createConfigurationFiles({ projectName, appSecret }) {
  // Create a simple iApp configuration file
  const configContent = {
    projectName: projectName,
    appSecret: appSecret,
  };
  await fs.writeFile(
    CONFIG_FILE,
    JSON.stringify(configContent, null, 2),
    'utf8'
  );
}

async function copyChosenTemplateFiles({
  template,
  srcFile,
  useArgs,
  useProtectedData,
  useInputFile,
  useRequesterSecret,
  useAppSecret,
}) {
  const templatesBaseDir = path.resolve(
    fileURLToPath(import.meta.url),
    '../../..',
    'templates'
  );

  const write = async (file, content) => {
    const targetPath = path.join(process.cwd(), file);
    if (content) {
      await fs.writeFile(targetPath, content);
    } else {
      await copy(path.join(templateDir, file), targetPath);
    }
  };
  // copy selected template
  const templateDir = path.resolve(templatesBaseDir, template);
  const files = await fs.readdir(templateDir);
  await Promise.all(files.map((file) => write(file)));

  // rename _.gitignore (npm does not allow publishing files named .gitignore in a package)
  await fs.rename('_.gitignore', '.gitignore');

  // transform template: remove unwanted feature code inside " // <<feature>> ... // <</feature>>" tags
  const code = (await fs.readFile(srcFile)).toString('utf8');
  let modifiedCode = code;
  if (!useArgs) {
    modifiedCode = modifiedCode.replaceAll(
      / *\/\/ <<args>>\n((.*)\n)*? *\/\/ <<\/args>>\n/g,
      ''
    );
  }
  if (!useProtectedData) {
    modifiedCode = modifiedCode.replaceAll(
      / *\/\/ <<protectedData>>\n((.*)\n)*? *\/\/ <<\/protectedData>>\n/g,
      ''
    );
  }
  if (!useInputFile) {
    modifiedCode = modifiedCode.replaceAll(
      / *\/\/ <<inputFile>>\n((.*)\n)*? *\/\/ <<\/inputFile>>\n/g,
      ''
    );
  }
  if (!useRequesterSecret) {
    modifiedCode = modifiedCode.replaceAll(
      / *\/\/ <<requesterSecret>>\n((.*)\n)*? *\/\/ <<\/requesterSecret>>\n/g,
      ''
    );
  }
  if (!useAppSecret) {
    modifiedCode = modifiedCode.replaceAll(
      / *\/\/ <<appSecret>>\n((.*)\n)*? *\/\/ <<\/appSecret>>\n/g,
      ''
    );
  }
  // clean remaining <<feature>> tags
  modifiedCode = modifiedCode.replaceAll(/ *\/\/ <<(\/)?.*>>\n/g, '');
  await fs.writeFile(srcFile, modifiedCode);

  // copy common
  const commonPath = path.resolve(templatesBaseDir, 'common');
  await copy(commonPath, path.join(process.cwd()));

  if (useProtectedData) {
    const mockPath = path.resolve(templatesBaseDir, 'mock', 'protectedData');
    await copy(mockPath, PROTECTED_DATA_MOCK_DIR);
  }
}
