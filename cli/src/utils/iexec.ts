import { JsonRpcProvider } from 'ethers';
import { AbstractSigner } from 'ethers';
import { IExec } from 'iexec';
import { useExperimentalNetworks } from './featureFlags.js';

export function getIExec({
  signer,
  rpcHostUrl,
}: {
  signer?: AbstractSigner;
  rpcHostUrl: string;
}): IExec {
  const provider = new JsonRpcProvider(rpcHostUrl);
  return new IExec(
    {
      ethProvider: signer ? signer.connect(provider) : provider,
    },
    {
      allowExperimentalNetworks: useExperimentalNetworks,
    }
  );
}
