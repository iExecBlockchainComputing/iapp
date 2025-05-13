import { IExec, utils } from 'iexec';

export function getIExecDebug({
  privateKey,
  rpcHostUrl,
  smsDebugUrl,
}: {
  privateKey: string;
  rpcHostUrl: string;
  smsDebugUrl: string;
}): IExec {
  return new IExec(
    {
      ethProvider: utils.getSignerFromPrivateKey(rpcHostUrl, privateKey),
    },
    {
      smsURL: smsDebugUrl,
    }
  );
}
