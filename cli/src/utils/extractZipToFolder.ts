import path from 'node:path';
import fs from 'node:fs/promises';
import JSZip from 'jszip';
import { fileExists } from './fs.utils.js';

export async function extractZipToFolder(
  resultBuffer: Buffer | ArrayBuffer,
  outputFolder: string
) {
  const zip = await JSZip().loadAsync(resultBuffer);

  if (!(await fileExists(outputFolder))) {
    await fs.mkdir(outputFolder, { recursive: true });
  }

  for (const [relativePath, file] of Object.entries(zip.files)) {
    const outputPath = path.join(outputFolder, relativePath);

    if (file.dir) {
      await fs.mkdir(outputPath, { recursive: true });
    } else {
      const content = await file.async('nodebuffer');
      const fileDir = path.dirname(outputPath);

      if (!(await fileExists(fileDir))) {
        await fs.mkdir(fileDir, { recursive: true });
      }

      await fs.writeFile(outputPath, content);
    }
  }
}
