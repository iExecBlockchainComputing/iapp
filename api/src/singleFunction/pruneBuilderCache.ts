import Docker from 'dockerode';
import { logger } from '../utils/logger.js';

const docker = new Docker();

export async function pruneBuilderCache() {
  try {
    logger.info('pruneBuilderCache');
    const pruneInfo = await new Promise((resolve, reject) => {
      // dockerode does not expose methods to prune the builder cache
      // directly call the docker engine API
      // https://docs.docker.com/reference/api/engine/version/v1.47/#tag/Image/operation/BuildPrune
      docker.modem.dial(
        {
          path: '/build/prune',
          method: 'POST',
          statusCodes: {
            200: true, // success stats code
            500: 'Server error', // error status code
          },
        },
        (err, result) => {
          if (err) {
            reject(Error('Failed to prune builder cache', { cause: err }));
          } else {
            resolve(result);
          }
        }
      );
    });
    logger.debug(pruneInfo, 'pruneBuilderCache success');
  } catch (error) {
    logger.debug({ error }, 'pruneBuilderCache error');
    throw error;
  }
}
