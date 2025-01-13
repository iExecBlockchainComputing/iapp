/**
 * get an authorization token to perform operations on a repository of the docker hub registry
 *
 * NB: delivered token expires after 5 mins
 *
 * @param { Object } params
 * @param { string } params.repository docker repository name
 * @param { string } params.action docker action scope (ex "pull", "push")
 * @param { string } params.dockerhubUsername docker hub username (must have specified "action" access to repository)
 * @param { string } params.dockerhubAccessToken docker hub access token (must have specified "action" access to repository)
 * @returns { string } token
 */
export async function getAuthToken({
  repository,
  action = 'pull,push',
  dockerhubUsername,
  dockerhubAccessToken,
}) {
  const response = await fetch(
    `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repository}:${action}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${dockerhubUsername}:${dockerhubAccessToken}`).toString('base64')}`,
      },
    }
  );
  if (!response.ok) {
    throw Error(
      `Fail to get authorization token for scope=${repository}:${action}`
    );
  }
  const { token } = await response.json();
  return token;
}
