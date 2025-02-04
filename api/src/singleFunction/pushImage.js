import Docker from 'dockerode';
import { logger } from '../utils/logger.js';

const docker = new Docker();

/**
 * @param {Object} params
 * @param {string} params.image image to push
 * @param {string} params.repo target image repository
 * @param {string} params.tag target image tag
 * @param {string} params.pushToken auth token with pull,push access to the target image repository
 *
 * @returns {Promise<{ Tag: string, Digest: string, Size: number }>}
 */
export async function pushImage({ image, repo, tag, pushToken }) {
  logger.info(
    { image, repo, tag },
    `Pushing image: ${repo}:${tag} to DockerHub...`
  );
  const img = docker.getImage(image);
  await img.tag({
    repo,
    tag,
  });
  const taggedImg = docker.getImage(`${repo}:${tag}`);
  return new Promise((resolve, reject) => {
    taggedImg.push(
      {
        authconfig: {
          registrytoken: pushToken,
        },
      },
      function (err, stream) {
        let pushedImageResult;
        let isError = false;

        if (err) {
          logger.error(err, 'Error pushing the image');
          return reject(err);
        }

        docker.modem.followProgress(stream, onFinished, onProgress);

        function onFinished(err) {
          if (err || isError) {
            logger.error(err, 'Error in image pushing process:');
            return reject(err);
          }
          logger.info(
            pushedImageResult,
            `Successfully pushed the image to DockerHub`
          );
          resolve(pushedImageResult);
        }

        function onProgress(event) {
          if (event.error) {
            logger.error(event, '[img.push] onProgress ERROR');
            isError = true;
          } else {
            logger.debug(event, '[img.push] onProgress');
            if (event.aux) {
              pushedImageResult = event.aux;
            }
          }
        }
      }
    );
  });
}
