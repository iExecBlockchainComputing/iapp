import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { TEST_INPUT_DIR } from '../config/config.js';

// TODO we may want to cache to avoid downloading large input files over and over
/**
 * download input file in input dir and returns file name
 */
export async function prepareInputFile(url: string): Promise<string> {
  try {
    /**
     * the worker names the file after the url part after the last `/` occurrence 🤨 looks weird and leads to bugs.
     * investigating with core team to name downloaded files with uuid or other name safe collision resistant solution
     */
    const name = url.split('/').pop();
    if (name === '.' || name === '..') {
      throw Error('Invalid computed file name');
    }
    await fetch(url).then(async (response) => {
      await mkdir(TEST_INPUT_DIR, { recursive: true }); // ensure input dir
      await writeFile(join(TEST_INPUT_DIR, name), response.body);
    });
    return name;
  } catch (e) {
    throw Error(`Failed to prepare input file \`${url}\`: ${e}`);
  }
}
