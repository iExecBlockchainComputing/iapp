import { GrantedAccess } from '../types/index.js';

export const formatGrantedAccess = (
  order: {
    app: string;
    appprice: number | string;
    volume: number | string;
    tag: string;
    datasetrestrict: string;
    workerpoolrestrict: string;
    requesterrestrict: string;
    salt: string;
    sign: string;
  },
  remaining?: number
): GrantedAccess => {
  const formattedOrder = Object.fromEntries(
    Object.entries(order).map(([key, val]) => [
      key,
      val.toString().toLowerCase(),
    ]) // stringify numbers and lowercase addresses to return a clean GrantedAccess
  ) as Omit<GrantedAccess, 'remainingAccess'>;

  return {
    ...formattedOrder,
    remainingAccess: remaining || 0,
  };
};
