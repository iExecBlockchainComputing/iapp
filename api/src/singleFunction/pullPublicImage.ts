import Docker from 'dockerode';
import { logger } from '../utils/logger.js';

type ProgressEvent = { stream?: string; error?: Error };

const docker = new Docker();

export async function pullPublicImage(image: string) {
  try {
    await docker.ping();
  } catch {
    throw new Error('VM docker daemon not up?');
  }

  return new Promise<void>((resolve, reject) => {
    docker.pull(image, {}, function (err, stream) {
      if (err) {
        logger.error({ image, error: err }, 'Error pulling the image');
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
          logger.error({ image, err }, 'Error in image pulling process');
          return reject(err);
        }
        logger.info({ image }, 'Image pulled successfully');
        resolve();
      }

      function onProgress(event: ProgressEvent) {
        logger.trace(event, '[pull] onProgress');
      }
    });
  });
}
