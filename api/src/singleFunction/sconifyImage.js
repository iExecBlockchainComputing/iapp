import Docker from 'dockerode';
import { SCONIFY_IMAGE } from '../constants/constants.js';
import { logger } from '../utils/logger.js';
import { inspectImage } from './inspectImage.js';
import { pullSconeImage } from './pullSconeImage.js';
import { removeContainer } from './removeContainer.js';
import { pruneBuilderCache } from './pruneBuilderCache.js';

const docker = new Docker();

/**
 * Sconifies an iapp docker image
 *
 * @param { Object } params
 * @param { String } params.fromImage image to sconify
 * @param { String } params.entrypoint command to run the app (whitelisted)
 *
 * @returns { Promise<String> } sconified image id (`"sha256:..."`)
 */
export async function sconifyImage({ fromImage, entrypoint }) {
  logger.info({ fromImage, entrypoint }, 'Running sconify command...');

  logger.info({ sconeImage: SCONIFY_IMAGE }, 'Pulling scone image...');
  await pullSconeImage(SCONIFY_IMAGE);

  const toImage = `${fromImage}-tmp-sconified-${Date.now()}`; // create an unique temporary identifier for the target image
  logger.info({ fromImage, toImage }, 'Sconifying...');
  const sconifyContainer = await docker.createContainer({
    Image: SCONIFY_IMAGE,
    Cmd: [
      'sconify_iexec',
      `--from=${fromImage}`,
      `--to=${toImage}`,
      '--binary-fs',
      '--fs-dir=/app',
      '--host-path=/etc/hosts',
      '--host-path=/etc/resolv.conf',
      '--binary=/usr/local/bin/node',
      '--heap=1G',
      '--dlopen=1',
      '--no-color',
      '--verbose',
      `--command=${entrypoint}`,
    ],
    HostConfig: {
      Binds: ['/var/run/docker.sock:/var/run/docker.sock'],
    },
  });

  try {
    await sconifyContainer.start();
    sconifyContainer.attach(
      { stream: true, stdout: true, stderr: true },
      function (err, stream) {
        if (err) {
          logger.error(err, 'Error attaching to container');
          return;
        }
        stream.on('data', function (data) {
          const readableData = data.toString('utf8');
          logger.debug(readableData);
        });
      }
    );
    // TODO maybe add a timeout?
    await sconifyContainer.wait();

    const inspect = await sconifyContainer.inspect();
    if (inspect.State.ExitCode !== 0) {
      logger.warn(inspect.State, 'Sconify container exited with non-zero code');
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

  let builtImage;
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
