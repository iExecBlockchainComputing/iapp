import { EnhancedWallet } from 'iexec';
import { IExecConfigOptions } from 'iexec/IExecConfig';

export type Web3SignerProvider = EnhancedWallet;

export type ChainId = number;

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
