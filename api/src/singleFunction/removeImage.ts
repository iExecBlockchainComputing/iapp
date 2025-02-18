import Docker from 'dockerode';
import { logger } from '../utils/logger.js';

const docker = new Docker();

/**
 * remove a docker image
 */
export async function removeImage({
  imageId,
  force = false,
}: {
  /**
   * id of the image to remove
   */
  imageId: string;
  /**
   * if true kill containers running the image and remove all references
   */
  force?: boolean;
}): Promise<void> {
  try {
    logger.info({ imageId, force }, `removeImage`);
    const img = docker.getImage(imageId);
    await img.remove({ force: !!force });
  } catch (error) {
    logger.debug({ error }, 'removeImage error');
    throw Error(`Failed to remove image ${imageId}`, { cause: error });
  }
}
