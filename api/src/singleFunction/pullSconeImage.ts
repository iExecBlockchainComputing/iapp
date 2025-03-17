import Docker from 'dockerode';
import { logger } from '../utils/logger.js';

const docker = new Docker();

type ProgressEvent = { stream?: string; error?: Error };

const registryAuth = {
  username: process.env.SCONTAIN_REGISTRY_USERNAME,
  password: process.env.SCONTAIN_REGISTRY_PASSWORD,
  serveraddress: process.env.SCONTAIN_REGISTRY_SERVERADDRESS,
};

export function pullSconeImage(image: string) {
  if (
    !process.env.SCONTAIN_REGISTRY_USERNAME ||
    !process.env.SCONTAIN_REGISTRY_PASSWORD ||
    !process.env.SCONTAIN_REGISTRY_SERVERADDRESS
  ) {
    throw new Error(
      'Missing env vars: SCONTAIN_REGISTRY_USERNAME, SCONTAIN_REGISTRY_PASSWORD, SCONTAIN_REGISTRY_SERVERADDRESS are required'
    );
  }

  logger.info(`Pulling image: ${image}...`);

  return new Promise<void>((resolve, reject) => {
    docker.pull(image, { authconfig: registryAuth }, function (err, stream) {
      if (err) {
        logger.error({ image, error: err }, 'Error pulling the image:');
        return reject(err);
      }

      if (!stream) {
        const error = new Error('Missing docker pull readable stream');
        logger.error({ image, error }, error.message);
        return reject(error);
      }
      docker.modem.followProgress(stream, onFinished, onProgress);

      function onFinished(err: Error | null) {
        if (err) {
          logger.error(err, 'Error in image pulling process');
          return reject(err);
        }
        logger.info(`Image ${image} pulled successfully.`);
        resolve();
      }

      function onProgress(event: ProgressEvent) {
        logger.trace(event, '[pull] onProgress');
      }
    });
  });
}
