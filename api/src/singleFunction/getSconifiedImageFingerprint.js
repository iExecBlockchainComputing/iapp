import Docker from 'dockerode';
import { logger } from '../utils/logger.js';

const docker = new Docker();

/**
 * @param { Object } params
 * @param { String } params.image sconified image to get the fingerprint from
 *
 * @returns { Promise<String> } scone hash fingerprint
 */
export async function getSconifiedImageFingerprint({ image }) {
  const container = await docker.createContainer({
    Image: image,
    Cmd: [],
    HostConfig: {
      AutoRemove: false, // do not auto remove, we want to collect log after the container is exited
    },
    Env: ['SCONE_HASH=1'],
  });
  await container.start();
  // wait for the container to exit
  await container.wait();
  // get logs
  const stdoutBuffer = await container.logs({ stdout: true });
  // remove container now
  await container.remove();
  const fingerprint = stdoutBuffer
    .subarray(8) // strip 8 bytes header identifying the stream provenance
    .toString('utf8')
    .trim(); // strip trailing new line
  logger.info({ fingerprint }, 'Got scone fingerprint');
  if (!fingerprint) {
    throw new Error('No fingerprint found');
  }
  if (!fingerprint.match(/^([0-9a-f]{2}){32}$/)) {
    throw new Error(
      `Error getting fingerprint, value didn't match expected pattern, expected 32 bytes hex string, got "${fingerprint}"`
    );
  }
  return fingerprint;
}
