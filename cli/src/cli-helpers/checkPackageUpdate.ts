import { default as updateCheck, Result, Config } from 'update-check';
import { createRequire } from 'module';
import { command } from './color.js';
import { sleep } from '../utils/sleep.js';
import { hintBox } from './box.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

export async function checkPackageUpdate() {
  const updateCheckPromise = (
    updateCheck as unknown as (
      pkg: object,
      config?: Config
    ) => Promise<Result | null>
  )(pkg).catch(() => {
    // silently fail
    return undefined;
  });
  const timeoutPromise = sleep(3000);

  const update = await Promise.race([updateCheckPromise, timeoutPromise]);

  if (update?.latest) {
    const updateCommand = `npm i -g ${pkg?.name}`;
    // eslint-disable-next-line no-console
    console.log(
      hintBox(
        `iApp generator update available ${pkg?.version} → ${update.latest}
Run ${command(updateCommand)} to update`
      )
    );
  }
}
