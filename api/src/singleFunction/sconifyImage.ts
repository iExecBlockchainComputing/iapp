import Docker from 'dockerode';
import { SCONIFY_IMAGE_NAME } from '../constants/constants.js';
import { logger } from '../utils/logger.js';
import { inspectImage } from './inspectImage.js';
import { pruneBuilderCache } from './pruneBuilderCache.js';
import { pullSconeImage } from './pullSconeImage.js';
import { removeContainer } from './removeContainer.js';

const docker = new Docker();

/**
 * Sconifies an iapp docker image
 */
export async function sconifyImage({
  fromImage,
  sconifyVersion,
  entrypoint,
  binary,
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
   * command to run the app (whitelisted)
   */
  entrypoint: string;
  /**
   * whitelisted binary
   */
  binary: string;
}): Promise<string> {
  logger.info({ fromImage, entrypoint }, 'Running sconify command...');
  const sconifierImage = `${SCONIFY_IMAGE_NAME}:${sconifyVersion}`;

  logger.info({ sconifierImage }, 'Pulling sconifier image...');
  await pullSconeImage(sconifierImage);

  const toImage = `${fromImage}-tmp-sconified-${Date.now()}`; // create an unique temporary identifier for the target image
  logger.info({ fromImage, toImage }, 'Sconifying...');
  const sconifyContainer = await docker.createContainer({
    Image: sconifierImage,
    Cmd: [
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
