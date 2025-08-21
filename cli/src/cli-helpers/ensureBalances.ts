import { warnBox } from './box.js';
import { emphasis, command, promptHelper } from './color.js';
import type { Spinner } from './spinner.js';
import { BN, IExec, utils } from 'iexec';

export async function ensureBalances({
  spinner,
  iexec,
  warnOnlyRlc = false,
  nRlcMin,
  weiMin,
}: {
  spinner: Spinner;
  iexec: IExec;
  warnOnlyRlc?: boolean;
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

  const shouldThrow = missingNative || (missingRlc && !warnOnlyRlc);

  // always show missing balance warnings
  if (missingNative || missingRlc) {
    const helpers = [];
    if (missingNative) {
      const msg =
        ' - Native asset balance required for blockchain transactions is ' +
        (wei.isZero() ? 'empty' : 'insufficient');
      const requirement = weiMin
        ? ` (requires ${utils.formatEth(weiMin as BN)} ether)`
        : '';
      helpers.push(`${msg}${requirement}`);
    }
    if (missingRlc) {
      const msg =
        ' - RLC token balance required for iapp runs is ' +
        (totalRlc.isZero() ? 'empty' : 'insufficient') +
        (warnOnlyRlc ? promptHelper(' (warning only)') : '');
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
  }

  if (shouldThrow) {
    throw Error(`Balance is insufficient`);
  }

  return {
    wei,
    nRLC,
    stake,
  };
}
