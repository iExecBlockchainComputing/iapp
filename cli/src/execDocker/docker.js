import Docker from 'dockerode';
import os from 'os';

const docker = new Docker();

export async function checkDockerDaemon() {
  try {
    await docker.ping();
  } catch {
    throw Error(
      'Docker daemon is not accessible, make sure docker is installed and running'
    );
  }
}

export async function dockerBuild({
  tag = undefined,
  isForTest = false,
  progressCallback = () => {},
}) {
  const osType = os.type();
  const buildArgs = {
    context: process.cwd(), // Use current working directory
    src: ['./'],
  };

  // by default force to build amd64 image which is architecture used in iExec workers
  // this require buildx builder to support 'linux/amd64' (some devices may need QEMU for amd64 architecture emulation)
  let platform = 'linux/amd64';
  // for MacOS local testing only build arm64 variant
  if (osType === 'Darwin' && isForTest) {
    platform = 'linux/arm64';
  }

  // Perform the Docker build operation
  const buildImageStream = await docker.buildImage(buildArgs, {
    t: tag,
    platform,
  });

  const imageId = await new Promise((resolve, reject) => {
    docker.modem.followProgress(buildImageStream, onFinished, onProgress);

    function onFinished(err, output) {
      /**
       * expected output format for image id
       * ```
       *   {
       *    aux: {
       *      ID: 'sha256:e994101ce877e9b42f31f1508e11bbeb8fa5096a1fb2d0c650a6a26797b1906b'
       *    }
       *  },
       * ```
       */
      const builtImageId = output?.find((row) => row?.aux?.ID)?.aux?.ID;

      /**
       * 3 kind of error possible, we want to catch each of them:
       * - stream error
       * - build error
       * - no image id (should not happen)
       *
       * expected output format for build error
       * ```
       *   {
       *     errorDetail: {
       *       code: 1,
       *       message: "The command '/bin/sh -c npm ci' returned a non-zero code: 1"
       *     },
       *     error: "The command '/bin/sh -c npm ci' returned a non-zero code: 1"
       *   }
       * ```
       */
      const errorOrErrorMessage =
        err || // stream error
        output.find((row) => row?.error)?.error || // build error message
        (!builtImageId && 'Failed to retrieve generated image ID'); // no image id -> error message

      if (errorOrErrorMessage) {
        const error =
          errorOrErrorMessage instanceof Error
            ? errorOrErrorMessage
            : Error(errorOrErrorMessage);
        reject(error);
      } else {
        resolve(builtImageId);
      }
    }

    function onProgress(event) {
      if (event?.stream) {
        progressCallback(event.stream);
      }
    }
  });

  return imageId;
}

// Function to push a Docker image
export async function pushDockerImage({
  tag,
  dockerhubUsername,
  dockerhubAccessToken,
  progressCallback = () => {},
}) {
  if (!dockerhubUsername || !dockerhubAccessToken) {
    throw new Error('Missing DockerHub credentials.');
  }
  const dockerImage = docker.getImage(tag);

  const imagePushStream = await dockerImage.push({
    authconfig: {
      username: dockerhubUsername,
      password: dockerhubAccessToken,
    },
  });

  await new Promise((resolve, reject) => {
    docker.modem.followProgress(imagePushStream, onFinished, onProgress);

    function onFinished(err, output) {
      /**
       * 2 kind of error possible, we want to catch each of them:
       * - stream error
       * - push error
       *
       * expected output format for push error
       * ```
       *   {
       *     errorDetail: {
       *       message: 'Get "https://registry-1.docker.io/v2/": dial tcp: lookup registry-1.docker.io: Temporary failure in name resolution'
       *     },
       *     error: 'Get "https://registry-1.docker.io/v2/": dial tcp: lookup registry-1.docker.io: Temporary failure in name resolution'
       *   }
       * ```
       */
      const errorOrErrorMessage =
        err || // stream error
        output.find((row) => row?.error)?.error; // push error message

      if (errorOrErrorMessage) {
        const error =
          errorOrErrorMessage instanceof Error
            ? errorOrErrorMessage
            : Error(errorOrErrorMessage);
        return reject(error);
      }
      resolve(tag);
    }

    function onProgress(event) {
      if (event?.stream) {
        progressCallback(event.stream);
      }
    }
  });
}

export async function runDockerContainer({
  image,
  cmd,
  volumes = [],
  env = [],
  memory = undefined,
  logsCallback = () => {},
}) {
  const container = await docker.createContainer({
    Image: image,
    Cmd: cmd,
    HostConfig: {
      Binds: volumes,
      AutoRemove: false, // do not auto remove, we want to inspect after the container is exited
      Memory: memory,
    },
    Env: env,
  });

  // Start the container
  // TODO we should handle abort signal to stop the container and avoid containers running after command is interrupted
  await container.start();

  // get the logs stream
  const logsStream = await container.logs({
    follow: true,
    stdout: true,
    stderr: true,
  });
  logsStream.on('data', (chunk) => {
    // const streamType = chunk[0]; // 1 = stdout, 2 = stderr
    const logData = chunk.slice(8).toString('utf-8'); // strip multiplexed stream header
    logsCallback(logData);
  });
  logsStream.on('error', (err) => {
    logsCallback('Error streaming logs:', err.message);
  });

  // Wait for the container to finish
  await container.wait();

  // Check container status after waiting
  const { State } = await container.inspect();

  // Done with the container, remove the container
  await container.remove();

  return {
    exitCode: State.ExitCode,
    outOfMemory: State.OOMKilled,
  };
}
