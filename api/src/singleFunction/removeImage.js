import Docker from 'dockerode';
import { logger } from '../utils/logger.js';

const docker = new Docker();

/**
 * remove a docker image
 *
 * @param {Object} params
 * @param {string} params.imageId id of the image to remove
 * @param {string} params.force if true kill containers running the image and remove all references
 */
export async function removeImage({ imageId, force = false } = {}) {
  try {
    logger.info({ imageId, force }, `removeImage`);
    const img = docker.getImage(imageId);
    await img.remove({ force: !!force });
  } catch (error) {
    logger.debug({ error }, 'removeImage error');
    throw Error(`Failed to remove image ${imageId}`, { cause: error });
  }
}
