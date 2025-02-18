import { isAddress } from 'ethers';
import { z } from 'zod';

export const ethereumAddressZodSchema = z.string().refine(
  (value) => {
    try {
      return isAddress(value);
    } catch {
      return false;
    }
  },
  {
    message:
      'A valid wallet address is required. Ex: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  }
);
