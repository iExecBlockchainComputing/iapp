/**
 * get an authorization token to perform operations on a repository of the docker hub registry
 *
 * NB: delivered token expires after 5 mins
 */
export async function getAuthToken({
  repository,
  action = 'pull,push',
  dockerhubUsername,
  dockerhubAccessToken,
}: {
  /**
   * docker repository name
   */
  repository: string;
  /**
   * docker hub username (must have specified "action" access to repository)
   */
  dockerhubUsername: string;
  /**
   * docker hub access token (must have specified "action" access to repository)
   */
  dockerhubAccessToken: string;
  /**
   * docker action scope (ex "pull", "push")
   */
  action?: string;
}): Promise<string> {
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
  return response
    .json()
    .catch(() => {
      throw Error(`Unexpected response from dockerhub auth server`);
    })
    .then(({ token }) => {
      if (!token) {
        throw Error(
          `Unexpected response from dockerhub auth server: Missing token`
        );
      }
      return token;
    });
}
