import { warnBox } from './box.js';
import { emphasis, command } from './color.js';
import type { Spinner } from './spinner.js';
import { BN, IExec, utils } from 'iexec';

export async function ensureBalances({
  spinner,
  iexec,
  nRlcMin,
  weiMin,
  warnOnlyRlc = false,
}: {
  spinner: Spinner;
  iexec: IExec;
  nRlcMin?: BN;
  weiMin?: BN;
  warnOnlyRlc?: boolean;
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

  // Always check native assets - they're required for transaction fees
  if (missingNative) {
    const msg = wei.isZero()
      ? ' - Native balance is empty'
      : ' - Native balance is insufficient';
    const requirement = weiMin
      ? ` (requires ${utils.formatEth(weiMin as BN)} ether)`
      : '';

    spinner.log(
      warnBox(`Current chain requires native asset to pay transaction fees!
 
Your wallet balance is insufficient:
${msg}${requirement}
        
You can either:
 - Fund your wallet ${emphasis(address)}
 - Import another wallet (run ${command('iapp wallet import')})
 - Select an imported wallet (run ${command('iapp wallet select')})
 - Use another chain (use option ${command('--chain <name>')})`)
    );
    throw Error(`Native balance is insufficient`);
  }

  // For RLC, either warn only or block based on warnOnlyRlc option
  if (missingRlc) {
    if (warnOnlyRlc) {
      // Just warn for RLC, don't block
      const msg = totalRlc.isZero()
        ? ' - RLC balance is empty'
        : ' - RLC balance is insufficient';
      const requirement = nRlcMin
        ? ` (requires ${utils.formatRLC(nRlcMin as BN)} RLC)`
        : '';

      spinner.warn(
        `⚠️  Warning: Your wallet has insufficient RLC balance:${msg}${requirement}. You'll need RLC to run your iApp later. Consider funding your wallet ${emphasis(address)} or importing another wallet.`
      );
    } else {
      // Block for RLC (original behavior)
      const msg = totalRlc.isZero()
        ? ' - RLC balance is empty'
        : ' - RLC balance is insufficient';
      const requirement = nRlcMin
        ? ` (requires ${utils.formatRLC(nRlcMin as BN)} RLC)`
        : '';

      spinner.log(
        warnBox(`Current chain requires RLC to pay iApp runs!
 
Your wallet balance is insufficient:
${msg}${requirement}
        
You can either:
 - Fund your wallet ${emphasis(address)}
 - Import another wallet (run ${command('iapp wallet import')})
 - Select an imported wallet (run ${command('iapp wallet select')})
 - Use another chain (use option ${command('--chain <name>')})`)
      );
      throw Error(`RLC balance is insufficient`);
    }
  }

  return {
    wei,
    nRLC,
    stake,
  };
}
