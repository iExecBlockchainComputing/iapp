import { join } from 'node:path';
import { access, constants } from 'node:fs/promises';
import Docker from 'dockerode';
import { SCONIFY_IMAGE_NAME } from '../constants/constants.js';
import { logger } from '../utils/logger.js';
import { inspectImage } from './inspectImage.js';
import { pruneBuilderCache } from './pruneBuilderCache.js';
import { pullSconeImage } from './pullSconeImage.js';
import { removeContainer } from './removeContainer.js';

const docker = new Docker();

const ENCLAVE_KEY_PATH = join(process.cwd(), 'sig/enclave-key.pem');

/**
 * Sconifies an iapp docker image
 */
export async function sconifyImage({
  fromImage,
  sconifyVersion,
  binary,
  prod = false,
}: {
  /**
   * image to sconify
   */
  fromImage: string;
  /**
   * sconifier version
   */
  sconifyVersion: string;
  /**
   * whitelisted binary
   */
  binary: string;
  /**
   * sconify production flag
   */
  prod?: boolean;
}): Promise<string> {
  logger.info(
    { fromImage },
    `Running sconify command in ${prod ? 'prod' : 'debug'} mode...`
  );
  const sconifierImage = `${SCONIFY_IMAGE_NAME}:${sconifyVersion}`;

  logger.info({ sconifierImage }, 'Pulling sconifier image...');
  await pullSconeImage(sconifierImage);

  if (prod) {
    // check signing key can be read on host
    try {
      await access(ENCLAVE_KEY_PATH, constants.R_OK);
    } catch (error) {
      logger.error(
        { error, path: ENCLAVE_KEY_PATH },
        'Cannot read enclave key from host'
      );
      throw new Error('Cannot read enclave key from host');
    }
  }

  const toImage = `${fromImage}-tmp-sconified-${Date.now()}`; // create an unique temporary identifier for the target image
  logger.info({ fromImage, toImage }, 'Sconifying...');

  const sconifyBaseCmd = [
    'sconify_iexec',
    `--from=${fromImage}`,
    `--to=${toImage}`,
    '--binary-fs',
    '--fs-dir=/app',
    '--host-path=/etc/hosts',
    '--host-path=/etc/resolv.conf',
    `--binary=${binary}`,
    '--heap=1G',
    '--dlopen=1',
    '--no-color',
    '--verbose',
  ];

  const baseBinds = ['/var/run/docker.sock:/var/run/docker.sock'];

  const sconifyContainer = await docker.createContainer({
    Image: sconifierImage,
    Cmd: prod
      ? sconifyBaseCmd.concat('--scone-signer=/sig/enclave-key.pem')
      : sconifyBaseCmd,
    HostConfig: {
      Binds: prod
        ? baseBinds.concat(`${ENCLAVE_KEY_PATH}:/sig/enclave-key.pem:ro`) // mount signing key
        : baseBinds,
    },
  });

  try {
    await sconifyContainer.start();
    sconifyContainer.attach(
      { stream: true, stdout: true, stderr: true },
      function (err, stream) {
        if (err || !stream) {
          logger.warn(err, 'Cannot get sconify container logs');
          return;
        }
        stream.on('data', function (data) {
          const readableData = data.toString('utf8');
          logger.trace(readableData);
        });
      }
    );
    // TODO maybe add a timeout?
    await sconifyContainer.wait();

    const inspect = await sconifyContainer.inspect();
    if (inspect.State.ExitCode !== 0) {
      logger.error(
        inspect.State,
        'Sconify container exited with non-zero code'
      );
      throw Error(
        `Sconify container exited with error (code: ${inspect.State.ExitCode})`
      );
    }
  } finally {
    logger.info(
      { containerId: sconifyContainer.id },
      'Removing sconify container'
    );
    // remove the sconify container when finished or when an error occurs (keep the image)
    // non blocking for user
    removeContainer({
      containerId: sconifyContainer.id,
      kill: true, // force container to exit if it is still running
      volumes: true,
    })
      .then(() => {
        logger.info(
          { containerId: sconifyContainer.id },
          'Sconify container removed'
        );
      })
      .catch((error) => {
        // no-op
        logger.warn(
          { error },
          `Failed to remove sconify container ${sconifyContainer.id}`
        );
      });
    // also remove generated builder cache
    pruneBuilderCache().catch((error) => {
      // no-op
      logger.warn({ error }, `Failed to prune builder cache`);
    });
  }

  let builtImage: Docker.ImageInspectInfo;
  try {
    builtImage = await inspectImage(toImage);
  } catch (error) {
    logger.error({ error, expectedImage: toImage }, 'ERROR inspectImage');
    throw new Error('Error at sconify process');
  }
  if (!builtImage) {
    throw new Error('Error at sconify process');
  }
  logger.info({ toImage, builtImage }, 'Successfully built TEE docker image');

  return builtImage.Id;
}
