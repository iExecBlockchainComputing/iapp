import { JsonRpcProvider } from 'ethers';
import { AbstractSigner } from 'ethers';
import { IExec } from 'iexec';
import { useExperimentalNetworks } from './featureFlags.js';

export function getIExecDebug({
  signer,
  rpcHostUrl,
  smsDebugUrl,
}: {
  signer: AbstractSigner;
  rpcHostUrl: string;
  smsDebugUrl: string;
}): IExec {
  return new IExec(
    {
      ethProvider: signer.connect(new JsonRpcProvider(rpcHostUrl)),
    },
    {
      smsURL: smsDebugUrl,
      allowExperimentalNetworks: useExperimentalNetworks,
    }
  );
}
