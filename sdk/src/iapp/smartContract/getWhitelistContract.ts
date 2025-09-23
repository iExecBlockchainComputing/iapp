import { Contract } from 'ethers';
import { IExec } from 'iexec';
import { ABI } from './ERC734_ABI.js';
import { AddressOrENS } from '../../types/index.js';

export async function getWhitelistContract(
  iexec: IExec,
  contractAddress: AddressOrENS
): Promise<any> {
  const { signer } = await iexec.config.resolveContractsClient();
  return new Contract(contractAddress, ABI).connect(signer);
}
