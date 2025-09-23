import { zeroPadValue } from 'ethers';
import { Address } from 'iexec';
import { GROUP_MEMBER_PURPOSE } from '../../config/config.js';

export const isAddressInWhitelist = async ({
  whitelistContract,
  address,
}: {
  whitelistContract: any;
  address: Address;
}): Promise<boolean> => {
  return whitelistContract.keyHasPurpose(
    zeroPadValue(address, 32),
    GROUP_MEMBER_PURPOSE
  );
};
