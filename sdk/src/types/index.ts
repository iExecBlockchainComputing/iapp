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

export type DefaultWorkerpoolConsumer = {
  defaultWorkerpool: AddressOrENS;
};

export type MatchOptions = {
  useVoucher: boolean;
  voucherAddress?: string;
};

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

// ---------------------GetIApp Types------------------------------------
export type IApp = {
  name: string;
  address: Address;
  owner: Address;
  creationTimestamp: number;
  multiaddr?: string; // Ex: "/p2p/QmaiUykRQKPC2PDXvmiqdhDm553JybgLurUUiDYy78rMgY"
};

export type GetIAppParams = {
  iapp?: AddressOrENS;
  owner?: AddressOrENS;
  createdAfterTimestamp?: number;
  page?: number;
  pageSize?: number;
};

// ---------------------GetGrantedAccess Types------------------------------------
export type GetGrantedAccessParams = {
  /**
   * iApp address or ENS
   *
   * Default fetch for any iApp
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
  authorizedProtectedData?: AddressOrENS;

  /**
   * Address or ENS of the user authorized to use the `protectedData`
   *
   * The address zero `0x0000000000000000000000000000000000000000` can be use to authorize any user to use the `protectedData`.
   */
  authorizedUser?: AddressOrENS;

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

// ---------------------RunIApp Types------------------------------------
export type RunIAppStatuses =
  | 'FETCH_ORDERS'
  | 'FETCH_PROTECTED_DATA_ORDERBOOK'
  | 'FETCH_APP_ORDERBOOK'
  | 'FETCH_WORKERPOOL_ORDERBOOK'
  | 'PUSH_REQUESTER_SECRET'
  | 'REQUEST_TO_RUN_IAPP'
  | 'CONSUME_TASK'
  | 'CONSUME_RESULT_DOWNLOAD'
  | 'CONSUME_RESULT_DECRYPT';

export type RunIAppParams = {
  /**
   * Address or ENS (Ethereum Name Service) of the iapp.
   */
  iapp: AddressOrENS;

  /**
   * Address or ENS of the authorized protected data that the iapp will process.
   */
  protectedData?: AddressOrENS;

  /**
   * The maximum price of dataset per task for processing the protected data.
  @default = 0
  */
  dataMaxPrice?: number;

  /**
   * The maximum price of application per task for processing the protected data.
  @default = 0
  */
  appMaxPrice?: number;

  /**
   * The maximum price of workerpool per task for processing the protected data.
  @default = 0
  */
  workerpoolMaxPrice?: number;

  /**
   * The file name of the desired file in the returned ZIP file.
   */
  path?: string;

  /**
   * Arguments to pass to the application during execution.
   */
  args?: string;

  /**
   * The input file required for the application's execution (direct download URL).
   */
  inputFiles?: string[];

  /**
   * Requester secrets necessary for the application's execution.
   * It is represented as a mapping of numerical identifiers to corresponding secrets.
   */
  secrets?: Record<number, string>;

  /**
   * Address or ENS of the smart contract to be called back once the task is completed.
   */
  callbackContract?: AddressOrENS;

  /**
   * The workerpool to use for the application's execution. (default iExec production workerpool)
   */
  workerpool?: AddressOrENS;

  /**
   * A boolean that indicates whether to use a voucher or no.
   */
  useVoucher?: boolean;

  /**
   * Override the voucher contract to use, must be combined with useVoucher: true the user must be authorized by the voucher's owner to use it.
   */
  voucherOwner?: AddressOrENS;

  /**
   * Callback function that will get called at each step of the process
   */
  onStatusUpdate?: OnStatusUpdateFn<RunIAppStatuses>;
};

export type RunIAppResponse = {
  txHash: string;
  dealId: string;
  taskId: string;
  result?: ArrayBuffer;
};
