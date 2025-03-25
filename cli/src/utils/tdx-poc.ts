// PoC to demonstrate use of TDX iApps with the TDX testbed
// most of the logic is gathered in this module to limit impacts on the project
import Docker from 'dockerode';
import { IExec, utils } from 'iexec';
import { pushDockerImage } from '../execDocker/docker.js';

// TDX feature flag, set env EXPERIMENTAL_TDX_APP=1 to enable
export const useTdx = !!process.env.EXPERIMENTAL_TDX_APP;

// TODO move this constant
export const WORKERPOOL_TDX = 'tdx-labs.pools.iexec.eth';

// TODO move this logic
export function getIExecTdx({
  privateKey,
  name,
  rpcHostUrl,
}: {
  privateKey: string;
  name: string;
  rpcHostUrl: string;
}): IExec {
  if (name !== 'bellecour') {
    throw Error(`TDX is not supported on chain ${name}`);
  }
  return new IExec(
    {
      ethProvider: utils.getSignerFromPrivateKey(rpcHostUrl, privateKey),
    },
    {
      smsURL: 'https://sms.labs.iex.ec',
    }
  );
}

const docker = new Docker();
// TODO move this logic to docker.ts
async function tagDockerImage({
  image,
  repo,
  tag,
}: {
  image: string;
  repo: string;
  tag: string;
}) {
  const dockerImage = docker.getImage(image);
  await dockerImage.tag({
    repo,
    tag,
  });
  return `${repo}:${tag}`;
}
// TODO move this logic to docker.ts
function inspectImage(image: string) {
  const img = docker.getImage(image);
  return img.inspect();
}

function parseImagePath(dockerImagePath: string) {
  const dockerUserName = dockerImagePath.split('/')[0];
  const nameWithTag = dockerImagePath.split('/')[1];
  const imageName = nameWithTag.split(':')[0];
  const imageTag = nameWithTag.split(':')[1] || 'latest';
  return { dockerUserName, imageName, imageTag };
}

export const deployTdxApp = async ({
  iexec,
  image,
  dockerhubUsername,
  dockerhubAccessToken,
}: {
  iexec: IExec;
  image: string;
  dockerhubUsername: string;
  dockerhubAccessToken: string;
}) => {
  const { dockerUserName, imageName, imageTag } = parseImagePath(image);
  const repo = `${dockerUserName}/${imageName}`;
  const inspectResult = await inspectImage(image);

  const appEntrypoint = Array.isArray(inspectResult.Config.Entrypoint)
    ? inspectResult.Config.Entrypoint.join(' ')
    : inspectResult.Config.Entrypoint;

  const tdxImageShortId = inspectResult.Id.substring(7, 7 + 12); // extract 12 first chars after the leading "sha256:"
  const tdxImageTag = `${imageTag}-tdx-${tdxImageShortId}`; // add digest in tag to avoid replacing previous build
  const taggedImage = await tagDockerImage({ image, repo, tag: tdxImageTag });
  await pushDockerImage({
    tag: taggedImage,
    dockerhubUsername,
    dockerhubAccessToken,
  });
  const { address } = await iexec.app.deployApp({
    owner: await iexec.wallet.getAddress(),
    name: `TDX POC ${imageName}-${imageTag}`,
    type: 'DOCKER',
    multiaddr: taggedImage,
    checksum: `0x${inspectResult.RepoDigests[0].split('@sha256:')[1]}`,
    mrenclave: {
      // TODO TDX does not exists for now in iexec SDK, using SCONE shaped mrenclave for the PoC
      framework: 'SCONE', // TODO TBD should be TDX
      version: 'TDX-POC', // TODO TBD
      entrypoint: appEntrypoint,
      heapSize: 1073741824, // TODO not needed for TDX, set to pass scone mrenclave validation
      fingerprint:
        '0ce518e5df689f59ffae43c38746d087fab60f409b7c959bfe4fc6c67bc179be', // TODO not needed for TDX, used keccak256("TDX-POC") to pass scone mrenclave validation
    },
  });
  return { tdxImage: taggedImage, appContractAddress: address };
};
