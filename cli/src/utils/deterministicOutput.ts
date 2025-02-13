import Buffer from 'node:buffer';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { fromError } from 'zod-validation-error';
import {
  IEXEC_COMPUTED_JSON,
  IEXEC_DETERMINISTIC_OUTPUT_PATH_KEY,
  IEXEC_OUT,
  TEST_OUTPUT_DIR,
} from '../config/config.js';
import { fileExists } from './fs.utils.js';

const computedJsonFileSchema = z.object({
  [IEXEC_DETERMINISTIC_OUTPUT_PATH_KEY]: z.string().startsWith(IEXEC_OUT),
});

export async function checkDeterministicOutputExists({
  outputPath,
}: {
  outputPath: string;
}) {
  const { deterministicOutputLocalPath } = await getDeterministicOutputPath({
    outputPath,
  });
  const deterministicOutputExists = await fileExists(
    deterministicOutputLocalPath
  );
  if (!deterministicOutputExists) {
    throw Error(
      `Invalid "${IEXEC_DETERMINISTIC_OUTPUT_PATH_KEY}" in ${IEXEC_COMPUTED_JSON}, specified file or directory does not exists`
    );
  }
}

export async function getDeterministicOutputAsText({
  outputPath,
}: {
  outputPath: string;
}): Promise<{
  text: string;
  path: string;
}> {
  const { deterministicOutputLocalPath } = await getDeterministicOutputPath({
    outputPath,
  });
  const stats = await stat(deterministicOutputLocalPath);
  if (!stats.isFile()) {
    throw Error('Deterministic output is not a file');
  }
  const deterministicFileContent = await readFile(deterministicOutputLocalPath);
  if (!Buffer.isUtf8(deterministicFileContent)) {
    throw Error('Deterministic output is not a text file');
  }
  return {
    text: deterministicFileContent.toString('utf8'),
    path: deterministicOutputLocalPath,
  };
}

async function getDeterministicOutputPath({
  outputPath,
}: {
  outputPath: string;
}): Promise<{
  deterministicOutputRawPath: string;
  deterministicOutputLocalPath: string;
}> {
  const computed = await readComputedJson({ outputPath });
  let computedObj;
  try {
    computedObj = computedJsonFileSchema.parse(computed);
  } catch (e) {
    const validationError = fromError(e);
    const errorMessage = `Invalid ${IEXEC_COMPUTED_JSON}: ${validationError.toString()}`;
    throw Error(errorMessage);
  }
  const deterministicOutputRawPath =
    computedObj[IEXEC_DETERMINISTIC_OUTPUT_PATH_KEY];
  const deterministicOutputLocalPath = join(
    outputPath || TEST_OUTPUT_DIR,
    deterministicOutputRawPath.substring(IEXEC_OUT.length)
  );
  return {
    deterministicOutputRawPath,
    deterministicOutputLocalPath,
  };
}

async function readComputedJson({
  outputPath,
}: {
  outputPath: string;
}): Promise<object> {
  const content = await readFile(
    join(outputPath || TEST_OUTPUT_DIR, IEXEC_COMPUTED_JSON),
    'utf8'
  ).catch(() => {
    throw Error(`Failed to read ${IEXEC_COMPUTED_JSON}: missing file`);
  });
  try {
    return JSON.parse(content);
  } catch {
    throw Error(`Failed to read ${IEXEC_COMPUTED_JSON}: invalid JSON`);
  }
}
