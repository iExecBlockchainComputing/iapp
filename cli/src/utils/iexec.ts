import { JsonRpcProvider } from 'ethers';
import { AbstractSigner } from 'ethers';
import { IExec } from 'iexec';
import { useExperimentalNetworks } from './featureFlags.js';

export function getIExec({
  signer,
  rpcHostUrl,
}: {
  signer: AbstractSigner;
  rpcHostUrl: string;
}): IExec {
  return new IExec(
    {
      ethProvider: signer.connect(new JsonRpcProvider(rpcHostUrl)),
    },
    {
      allowExperimentalNetworks: useExperimentalNetworks,
    }
  );
}
