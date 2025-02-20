import { resolve } from 'node:path';
import { readdir } from 'node:fs/promises';
import { CONFIG_FILE } from '../config/config.js';
import type { Spinner } from './spinner.js';

async function locateConfigFileDir(currentPath: string): Promise<string> {
  try {
    const files = await readdir(currentPath, { withFileTypes: true });
    const configFile = files.find(
      (dirent) => dirent.name === CONFIG_FILE && dirent.isFile()
    );
    if (configFile) {
      return currentPath;
    }
    const parentPath = resolve(currentPath, '..');
    if (parentPath === currentPath) {
      throw Error('Reached root path');
    }
    return locateConfigFileDir(parentPath);
  } catch {
    throw Error(
      'Failed to locate iApp project root, are you in an iApp project? If you want to init a new project run `iapp init`'
    );
  }
}

export async function goToProjectRoot({ spinner }: { spinner: Spinner }) {
  const cwd = process.cwd();
  const projectPath = await locateConfigFileDir(cwd);
  if (cwd !== projectPath) {
    process.chdir(projectPath);
    spinner.info(`Running in iApp project directory "${projectPath}"`);
  }
}
