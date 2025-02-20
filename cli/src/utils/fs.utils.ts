import { access, copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

export async function fileExists(path: string) {
  return !!(await stat(path).catch(() => false));
}

export async function folderExists(folderPath: string) {
  try {
    await access(folderPath);
    return true;
  } catch {
    return false;
  }
}

export async function isFolderEmpty(path: string) {
  const files = await readdir(path);
  return files.length === 0 || (files.length === 1 && files[0] === '.git');
}

export async function copy(src: string, dest: string) {
  const stats = await stat(src);
  if (stats.isDirectory()) {
    await copyDir(src, dest);
  } else {
    await copyFile(src, dest);
  }
}

async function copyDir(srcDir: string, destDir: string) {
  await mkdir(destDir, { recursive: true });
  const files = await readdir(srcDir);
  await Promise.all(
    files.map((file) => {
      const srcFile = path.resolve(srcDir, file);
      const destFile = path.resolve(destDir, file);
      return copy(srcFile, destFile);
    })
  );
}
