import Docker from 'dockerode';
import { SCONIFY_IMAGE } from '../constants/constants.js';
import { logger } from '../utils/logger.js';
import { inspectImage } from './inspectImage.js';
import { pullSconeImage } from './pullSconeImage.js';

const docker = new Docker();

export async function sconifyImage({ fromImage, toImage, imageName }) {
  logger.info({ fromImage, toImage, imageName }, 'Running sconify command...');

  logger.info({ sconeImage: SCONIFY_IMAGE }, 'Pulling scone image...');
  await pullSconeImage(SCONIFY_IMAGE);

  const sconifyContainer = await docker.createContainer({
    Image: SCONIFY_IMAGE,
    Cmd: [
      'sconify_iexec',
      `--name=${imageName}`,
      `--from=${fromImage}`,
      `--to=${toImage}`,
      '--binary-fs',
      '--fs-dir=/app',
      '--host-path=/etc/hosts',
      '--host-path=/etc/resolv.conf',
      '--binary=/usr/local/bin/node',
      '--heap=1G',
      '--dlopen=1',
      '--no-color',
      '--verbose',
      '--command=node /app/src/app.js',
    ],
    HostConfig: {
      Binds: ['/var/run/docker.sock:/var/run/docker.sock'],
      AutoRemove: true,
    },
  });

  await sconifyContainer.start();

  let hasError = false;
  sconifyContainer.attach(
    { stream: true, stdout: true, stderr: true },
    function (err, stream) {
      if (err) {
        console.error('Error attaching to container:', err);
        return;
      }

      // Try to detect any 'docker build' error, otherwise log to stdout
      stream.on('data', function (data) {
        const readableData = data.toString('utf8');
        console.log(readableData);
        if (readableData.toLowerCase().includes('error')) {
          logger.error('Sconify docker container error');
          hasError = true;
        }
      });
    }
  );

  await sconifyContainer.wait();
  if (hasError) {
    throw new Error('Error at sconify process');
  }

  let builtImage;
  try {
    builtImage = await inspectImage(toImage);
    console.log('builtImage', builtImage);
  } catch (error) {
    logger.error({ error, expectedImage: toImage }, 'ERROR inspectImage');
    throw new Error('Error at sconify process');
  }
  if (!builtImage) {
    throw new Error('Error at sconify process');
  }

  logger.info({ toImage }, 'Successfully built TEE docker image');
}
