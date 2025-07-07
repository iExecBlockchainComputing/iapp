import { warnBox } from './box.js';
import { emphasis } from './color.js';
import type { Spinner } from './spinner.js';
import { IExec } from 'iexec';

export async function ensureBalances({
  spinner,
  iexec,
}: {
  spinner: Spinner;
  iexec: IExec;
}): Promise<void> {
  spinner.text = 'Checking wallet...';
  const chainId = await iexec.config.resolveChainId();
  if (chainId === 134) {
    return;
  }
  const address = await iexec.wallet.getAddress();
  const [{ nRLC, wei }, { stake }] = await Promise.all([
    iexec.wallet.checkBalances(address),
    iexec.account.checkBalance(address),
    // TODO check voucher?
  ]);
  const hasNative = !wei.isZero();
  const hasRlc = !stake.isZero || !nRLC.isZero();
  if (hasNative && hasRlc) {
    return;
  }

  const helpers = [];
  if (!hasNative) helpers.push(' - Native asset balance is empty');
  if (!hasRlc) helpers.push(' - RLC balance is empty');

  spinner.log(
    warnBox(`Current chain requires native asset to pay transactions fees and RLC to pay iApp runs!
 
Your wallet balance is insufficient:
${helpers.join('\n')}
        
Please fill your wallet ${emphasis(address)} or use another one`)
  );
  throw Error(`Balance is insufficient`);
}
