import { jwtDecode } from 'jwt-decode';

/**
 * Checks the pushToken can be used to push on a specified repository
 */
export async function checkPushToken({ pushToken, repository }) {
  const decoded = jwtDecode(pushToken);

  if (!Array.isArray(decoded?.access)) {
    throw Error('Missing access in jwt');
  }
  // check claims
  const hasPushAccess = decoded?.access?.some(
    (access) =>
      access?.type === 'repository' &&
      access?.name === repository &&
      Array.isArray(access?.actions) &&
      access?.actions.includes('pull') &&
      access?.actions.includes('push')
  );
  if (!hasPushAccess) {
    throw Error(`Missing push access on ${repository}`);
  }
  // check validity against server
  const DOCKER_REGISTRY = 'registry-1.docker.io';
  const response = await fetch(`https://${DOCKER_REGISTRY}/v2/`, {
    method: 'HEAD',
    headers: {
      Authorization: `Bearer ${pushToken}`,
    },
  }).catch((e) => {
    throw Error(`Failed to contact server ${DOCKER_REGISTRY}`, { cause: e });
  });
  if (!response.status === 200) {
    throw Error(`Token validity check against ${DOCKER_REGISTRY} failed`);
  }
}
