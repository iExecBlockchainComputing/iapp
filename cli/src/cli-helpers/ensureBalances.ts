import { warnBox } from './box.js';
import { emphasis, command } from './color.js';
import type { Spinner } from './spinner.js';
import { BN, IExec, utils } from 'iexec';

export async function ensureBalances({
  spinner,
  iexec,
  nRlcMin,
  weiMin,
}: {
  spinner: Spinner;
  iexec: IExec;
  nRlcMin?: BN;
  weiMin?: BN;
}): Promise<{
  wei: BN;
  nRLC: BN;
  stake: BN;
}> {
  const chainId = await iexec.config.resolveChainId();
  const address = await iexec.wallet.getAddress();
  const [{ nRLC, wei }, { stake }] = await Promise.all([
    iexec.wallet.checkBalances(address),
    iexec.account.checkBalance(address),
    // TODO check voucher?
  ]);

  const totalRlc = stake.add(nRLC);

  const missingNative =
    (chainId !== 134 && wei.isZero()) || (!!weiMin && wei.lt(weiMin));
  const missingRlc =
    (chainId !== 134 && totalRlc.isZero()) ||
    (!!nRlcMin && totalRlc.lt(nRlcMin));

  if (!missingNative && !missingRlc) {
    return {
      wei,
      nRLC,
      stake,
    };
  }

  const helpers = [];
  if (missingNative) {
    const msg = wei.isZero()
      ? ' - Native balance is empty'
      : ' - Native balance is insufficient';
    const requirement = weiMin
      ? ` (requires ${utils.formatEth(weiMin as BN)} ether)`
      : '';
    helpers.push(`${msg}${requirement}`);
  }
  if (missingRlc) {
    const msg = totalRlc.isZero()
      ? ' - RLC balance is empty'
      : ' - RLC balance is insufficient';
    const requirement = nRlcMin
      ? ` (requires ${utils.formatRLC(nRlcMin as BN)} RLC)`
      : '';
    helpers.push(`${msg}${requirement}`);
  }

  spinner.log(
    warnBox(`Current chain requires ${chainId !== 134 ? 'native asset to pay transaction fees and ' : ''}RLC to pay iApp runs!
 
Your wallet balance is insufficient:
${helpers.join('\n')}
        
You can either:
 - Fund your wallet ${emphasis(address)}
 - Import another wallet (run ${command('iapp wallet import')})
 - Select an imported wallet (run ${command('iapp wallet select')})
 - Use another chain (use option ${command('--chain <name>')})`)
  );
  throw Error(`Balance is insufficient`);
}
