import Docker from 'dockerode';
import { logger } from '../utils/logger.js';

const docker = new Docker();

/**
 * remove a docker container
 */
export async function removeContainer({
  containerId,
  kill = false,
  volumes = false,
}: {
  /**
   * id of the container to remove
   */
  containerId: string;
  /**
   * if true force removing the container even if it is running
   */
  kill?: boolean;
  /**
   * if true remove volumes mounted to the container
   */
  volumes?: boolean;
}) {
  try {
    logger.info({ containerId, kill, volumes }, `removeContainer`);
    const container = docker.getContainer(containerId);
    const containerInfoFull = await container.inspect();

    await container.remove({ force: !!kill });

    const mountedVolumes = containerInfoFull.Mounts.filter(
      (
        mount: any /** any to workaround issue in @types/dockerode https://github.com/DefinitelyTyped/DefinitelyTyped/pull/71974 */
      ) => mount?.Type === 'volume' && mount.Name
    );

    if (mountedVolumes.length > 0) {
      if (volumes) {
        // Removing volumes
        logger.info(
          { volumes: mountedVolumes },
          `container ${containerId} removing ${mountedVolumes.length} mounted volumes`
        );
        const volumePromises = mountedVolumes.map(async ({ Name }) => {
          const volume = docker.getVolume(Name);
          await volume.remove();
        });
        const results = await Promise.allSettled(volumePromises);
        const rejections = results.filter(
          (result) => result.status === 'rejected'
        );
        if (rejections.length > 0) {
          logger.warn(rejections, 'failed to remove volumes');
        }
      } else {
        // some volumes may persist
        logger.warn(
          {
            volumes: mountedVolumes,
          },
          `container ${containerId} ${mountedVolumes.length} mounted volumes will not be removed`
        );
      }
    }
  } catch (error) {
    logger.debug({ error }, 'removeContainer error');
    throw Error(`Failed to remove container ${containerId}`, { cause: error });
  }
}
