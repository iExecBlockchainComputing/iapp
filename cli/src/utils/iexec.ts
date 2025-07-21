import { IExec, utils } from 'iexec';

export function getIExec({
  privateKey,
  rpcHostUrl,
}: {
  privateKey: string;
  rpcHostUrl: string;
}): IExec {
  return new IExec({
    ethProvider: utils.getSignerFromPrivateKey(rpcHostUrl, privateKey),
  });
}
