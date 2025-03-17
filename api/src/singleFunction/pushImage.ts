import Docker from 'dockerode';
import { logger } from '../utils/logger.js';

const docker = new Docker();

type PushResult = { Tag: string; Digest: string; Size: number };
type ProgressEvent = { stream?: string; error?: Error; aux?: PushResult };

export async function pushImage({
  image,
  repo,
  tag,
  pushToken,
}: {
  /**
   * image to push
   */
  image: string;
  /**
   * target image repository
   */
  repo: string;
  /**
   * target image tag
   */
  tag: string;
  /**
   * auth token with pull,push access to the target image repository
   */
  pushToken: string;
}): Promise<{ Tag: string; Digest: string; Size: number }> {
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
        let pushedImageResult: PushResult;
        let isError = false;

        if (err) {
          logger.error(
            { error: err, image: taggedImg },
            'Error pushing the image'
          );
          return reject(err);
        }
        if (!stream) {
          const error = new Error('Missing docker push readable stream');
          logger.error({ error, image: taggedImg }, error.message);
          return reject(error);
        }
        docker.modem.followProgress(stream, onFinished, onProgress);

        function onFinished(err: Error | null) {
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

        function onProgress(event: ProgressEvent) {
          if (event?.error) {
            logger.error(event, '[img.push] onProgress ERROR');
            isError = true;
          } else {
            logger.trace(event, '[img.push] onProgress');
            if (event.aux) {
              pushedImageResult = event.aux;
            }
          }
        }
      }
    );
  });
}
