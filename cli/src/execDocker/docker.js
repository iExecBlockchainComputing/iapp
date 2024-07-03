import ora from 'ora';
import os from 'os';
import Docker from 'dockerode';
import inquirer from 'inquirer';
import util from 'util';
import { exec } from 'child_process';

const docker = new Docker();
const execAsync = util.promisify(exec);

export async function checkDockerDaemon() {
  const checkDockerDaemonSpinner = ora(
    'Checking if docker daemon is running ...'
  ).start();
  try {
    await docker.ping();
    checkDockerDaemonSpinner.succeed('Docker daemon is running');
  } catch (e) {
    checkDockerDaemonSpinner.fail('You docker daemon is not up');
    throw new Error(e.message);
  }
}

export async function dockerBuild({
  dockerHubUser,
  dockerImageName,
  isForTest = false,
}) {
  const osType = os.type();
  const buildSpinner = ora('Building Docker image ...').start();

  let buildArgs = {
    context: process.cwd(), // Use current working directory
    src: ['Dockerfile'], // Specify Dockerfile path
    t: `${dockerHubUser}/${dockerImageName}`, // Tag for the image
  };

  if (osType === 'Darwin') {
    // For MacOS
    if (isForTest) {
      // ARM64 variant for local testing only
      buildArgs.platform = 'linux/arm64';
    } else {
      // AMD64 variant to deploy on iExec
      buildArgs.platform = 'linux/amd64';
    }
  }

  // Perform the Docker build operation
  return new Promise((resolve, reject) => {
    docker.buildImage(buildArgs, (error, stream) => {
      if (error) {
        buildSpinner.fail('Failed to build Docker image.');
        reject(error);
        return;
      }

      docker.modem.followProgress(stream, (err, res) => {
        if (err) {
          buildSpinner.fail('Failed to build Docker image.');
          reject(err);
        } else {
          buildSpinner.succeed('Docker image built.');
          resolve(res);
        }
      });
    });
  });
}

// Function to tag a Docker image
export async function tagDockerImage(dockerhubUsername, imageName, version) {
  const tagSpinner = ora('Tagging Docker image ...').start();
  const image = docker.getImage(`${dockerhubUsername}/${imageName}`);
  await image.tag({
    repo: `${dockerhubUsername}/${imageName}:${version}-debug`,
  });
  tagSpinner.succeed('Docker image tagged.');
}

// Function to push a Docker image
export async function pushDockerImage(dockerhubUsername, imageName, version) {
  const { dockerHubUsername, dockerHubPassword } = await getDockerCredentials();

  const dockerPushSpinner = ora('Docker push ...').start();
  const image = docker.getImage(
    `${dockerhubUsername}/${imageName}:${version}-debug`
  );
  dockerPushSpinner.succeed('Docker image pushed.');

  await image.push({
    authconfig: {
      username: dockerHubUsername,
      password: dockerHubPassword,
    },
  });
}

async function getDockerCredentials() {
  try {
    // Prompt user for Docker Hub credentials
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'dockerHubUsername',
        message: 'Enter your Docker Hub username:',
      },
      {
        type: 'password',
        name: 'dockerHubPassword',
        message: 'Enter your Docker Hub password:',
        mask: '*',
      },
    ]);

    return answers;
  } catch (err) {
    console.error('Failed to retrieve or save Docker credentials:', err);
    throw err;
  }
}

export async function runDockerContainer({
  dockerhubUsername,
  imageName,
  arg,
  withProtectedData,
}) {
  const runDockerContainerSpinner = ora(
    'Setting up Docker container...'
  ).start();

  try {
    const container = await docker.createContainer({
      Image: `${dockerhubUsername}/${imageName}`,
      Cmd: [arg],
      HostConfig: {
        Binds: [
          `${process.cwd()}/input:/iexec_in`,
          `${process.cwd()}/output:/iexec_out`,
        ],
        AutoRemove: true,
      },
      Env: [
        `IEXEC_IN=/iexec_in`,
        `IEXEC_OUT=/iexec_out`,
        ...(withProtectedData
          ? [`IEXEC_DATASET_FILENAME=protectedData.zip`]
          : []),
      ],
    });

    // Attach to container output stream for real-time logging
    container.attach(
      { stream: true, stdout: true, stderr: true },
      function (err, stream) {
        if (err) {
          console.error('Error attaching to container:', err);
          runDockerContainerSpinner.fail(
            'Failed to attach to Docker container.'
          );
          throw err;
        }

        stream.pipe(process.stdout); // Pipe container output to stdout
      }
    );

    // Start the container
    await container.start();
    runDockerContainerSpinner.text = 'Running Docker container...';

    // Wait for the container to finish
    await container.wait();

    // Check container status after waiting
    const containerInspect = await container.inspect();
    if (containerInspect.State.Status !== 'exited') {
      runDockerContainerSpinner.succeed('Docker container run successfully.');
    } else {
      runDockerContainerSpinner.fail('Docker container exited unexpectedly.');
      throw new Error('Docker container exited unexpectedly.');
    }

    // Prompt user to view result
    const continueAnswer = await inquirer.prompt({
      type: 'confirm',
      name: 'continue',
      message: 'Would you like to see the result? (View output/result.txt)',
    });
    if (continueAnswer.continue) {
      const { stdout } = await execAsync('cat output/result.txt');
      console.log(stdout.toString());
    }
  } catch (error) {
    runDockerContainerSpinner.fail('Failed to run Docker container.');
    throw error;
  } finally {
    runDockerContainerSpinner.stop();
  }
}
