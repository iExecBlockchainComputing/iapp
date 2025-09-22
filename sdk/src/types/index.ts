import { EnhancedWallet } from 'iexec';
import { IExecConfigOptions } from 'iexec/IExecConfig';

/***************************************************************************
 *                        Common Types                                     *
 ***************************************************************************/

type ENS = string;

export type ChainId = number;

export type Address = string;

export type Web3SignerProvider = EnhancedWallet;

/**
 * ethereum address or ENS name (Ethereum Name Service)
 */
export type AddressOrENS = Address | ENS;

export type OnStatusUpdateFn<T> = (params: {
  title: T;
  isDone: boolean;
  payload?: Record<string, any>;
}) => void;

// ---------------------Constructor Types------------------------------------
/**
 * Configuration options for DataProtector.
 */
export type IAppConfigOptions = {
  /**
   * The subgraph URL for querying data.
   * If not provided, the default dataProtector subgraph URL will be used.
   * @default{@link DEFAULT_SUBGRAPH_URL}
   */
  subgraphUrl?: string;

  /**
   * The IPFS node URL.
   * If not provided, the default iApp IPFS node URL will be used.
   * @default{@link DEFAULT_IEXEC_IPFS_NODE}
   */
  ipfsNode?: string;

  /**
   * The IPFS gateway URL.
   * If not provided, the default iApp IPFS gateway URL will be used.
   * @default{@link DEFAULT_IPFS_GATEWAY}
   */
  ipfsGateway?: string;

  /**
   * Options specific to iExec integration.
   * If not provided, default iexec options will be used.
   */
  iexecOptions?: IExecConfigOptionsExtended;

  /**
   * if true allows using a provider connected to an experimental networks (default false)
   *
   * ⚠️ experimental networks are networks on which the iExec's stack is partially deployed, experimental networks can be subject to instabilities or discontinuity. Access is provided without warranties.
   */
  allowExperimentalNetworks?: boolean;
};

interface IExecConfigOptionsExtended extends IExecConfigOptions {
  // adds smsDebugURL to possible options, used ton configure an IExec debug instance seamlessly (no JS doc test purpose only)
  smsDebugURL?: string;
}

// ---------------------GetGrantedAccess Types------------------------------------
export type GetGrantedAccessParams = {
  /**
   * iApp address or ENS
   *
   * Default fetch for any protectedData
   */

  iapp?: AddressOrENS;

  /**
   * Address or ENS of the Protected Data authorized to use the `iapp`
   *
   * Default fetch for any Protected Data
   */
  authorizedProtectedData?: AddressOrENS;

  /**
   * Address or ENS of the user authorized to use the `protectedData`
   *
   * Default fetch for any user
   */
  authorizedUser?: AddressOrENS;

  /**
   * Fetches the orderbook strictly specified for this user
   *
   * Default false for any user
   */
  isUserStrict?: boolean;

  /**
   * Index of the page to fetch
   */
  page?: number;

  /**
   * Size of the page to fetch
   */
  pageSize?: number;
};

export type GrantedAccess = {
  app: string;
  appprice: string; // string notation allowed for big integers
  volume: string; // string notation allowed for big integers
  tag: string;
  datasetrestrict: string;
  workerpoolrestrict: string;
  requesterrestrict: string;
  salt: string;
  sign: string;
  remainingAccess: number;
};

export type GrantedAccessResponse = {
  count: number;
  grantedAccess: GrantedAccess[];
};

// ---------------------GrantAccess Types------------------------------------
export type GrantAccessStatuses = 'CREATE_IAPP_ORDER' | 'CREATE_IAPP_ORDER';

export type GrantAccessParams = {
  /**
   * iApp address or ENS
   */
  iapp: AddressOrENS;

  /**
   * Address or ENS of the protected data authorized to use the `iapp`
   */
  authorizedProtectedData: AddressOrENS;

  /**
   * Address or ENS of the user authorized to use the `protectedData`
   *
   * The address zero `0x0000000000000000000000000000000000000000` can be use to authorize any user to use the `protectedData`.
   */
  authorizedUser: AddressOrENS;

  /**
   * Price paid by the `authorizedUser` per access to the `protectedData` labeled in nRLC.
   */
  pricePerAccess?: number;

  /**
   * Total number of access to the `protectedData` for the generated authorization.
   */
  numberOfAccess?: number;

  /**
   * Callback function that will get called at each step of the process
   */
  onStatusUpdate?: OnStatusUpdateFn<GrantAccessStatuses>;
};

// ---------------------RevokeAccess Types------------------------------------
export type RevokeAllAccessStatuses =
  | 'RETRIEVE_ALL_GRANTED_ACCESS'
  | 'REVOKE_ONE_ACCESS';

export type RevokeAllAccessParams = {
  /**
   * iApp address or ENS
   */
  iapp: AddressOrENS;

  /**
   * Address or ENS of the protected data authorized to use the `iapp`
   *
   * Default revoke for any protectedData
   */
  authorizedProtectedData?: AddressOrENS;

  /**
   * Address or ENS of the user authorized to use the `protectedData`
   *
   * Default revoke for any user
   */
  authorizedUser?: AddressOrENS;

  /**
   * Callback function that will get called at each step of the process
   */
  onStatusUpdate?: OnStatusUpdateFn<RevokeAllAccessStatuses>;
};

export type RevokedAccess = {
  access: GrantedAccess;
  txHash: string;
};

// ---------------------TransferProtectedData Types------------------------------------
export type TransferParams = {
  iapp: AddressOrENS;
  newOwner: AddressOrENS;
};

export type TransferResponse = {
  address: Address;
  to: AddressOrENS;
  txHash: string;
};
