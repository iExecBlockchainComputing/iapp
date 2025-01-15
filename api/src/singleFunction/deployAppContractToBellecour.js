import { Wallet } from 'ethers';
import { getSignerFromPrivateKey } from 'iexec/utils';
import { IExec, IExecConfig } from 'iexec';
import { logger } from '../utils/logger.js';

/**
 * @returns {Promise<{appContractAddress: string}>}
 */
export async function deployAppContractToBellecour({
  userWalletPublicAddress,
  appName,
  dockerImage,
  dockerImageDigest,
  fingerprint,
  entrypoint,
}) {
  const privateKey = Wallet.createRandom().privateKey;
  const config = new IExecConfig({
    ethProvider: getSignerFromPrivateKey('bellecour', privateKey),
  });
  const iexec = IExec.fromConfig(config);
  const deployment = await iexec.app.deployApp({
    owner: userWalletPublicAddress,
    name: appName,
    type: 'DOCKER',
    multiaddr: dockerImage,
    checksum: `0x${dockerImageDigest}`,
    // Some code sample here: https://github.com/iExecBlockchainComputing/dataprotector-sdk/blob/v2/packages/protected-data-delivery-dapp/deployment/src/singleFunction/deployApp.ts
    mrenclave: {
      framework: 'SCONE',
      version: 'v5',
      entrypoint: entrypoint,
      heapSize: 1073741824,
      fingerprint,
    },
  });
  logger.info(deployment, 'app contract deployed');

  return {
    appContractAddress: deployment.address,
  };
}
