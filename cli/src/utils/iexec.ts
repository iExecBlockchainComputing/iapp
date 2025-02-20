import { IExec, utils } from 'iexec';

export function getIExecDebug(privateKey: string): IExec {
  return new IExec(
    {
      ethProvider: utils.getSignerFromPrivateKey('bellecour', privateKey),
    },
    {
      smsURL: 'https://sms.scone-debug.v8-bellecour.iex.ec',
    }
  );
}
