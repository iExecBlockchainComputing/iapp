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
        logger.error(err, 'Error pulling the image');
        return reject(err);
      }

      docker.modem.followProgress(stream, onFinished, onProgress);

      function onFinished(err: Error) {
        if (err) {
          logger.error({ image, err }, 'Error in image pulling process');
          return reject(err);
        }
        logger.info({ image }, 'Image pulled successfully');
        resolve();
      }

      function onProgress(event: ProgressEvent) {
        logger.debug(event, '[pull] onProgress');
      }
    });
  });
}
