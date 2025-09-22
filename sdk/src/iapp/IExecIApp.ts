import { AbstractProvider, AbstractSigner, Eip1193Provider } from 'ethers';
import { GraphQLClient } from 'graphql-request';
import { Web3SignerProvider, IAppConfigOptions } from '../types/types.js';
import { IExec } from 'iexec';
import { getChainConfig } from '../config/config.js';
import { getChainIdFromProvider } from '../utils/getChainId.js';

type EthersCompatibleProvider =
  | AbstractProvider
  | AbstractSigner
  | Eip1193Provider
  | Web3SignerProvider
  | string;

interface IExecIAppResolvedConfig {
  graphQLClient: GraphQLClient;
  ipfsNode: string;
  ipfsGateway: string;
  defaultWorkerpool: string;
  iexec: IExec;
}

export class IExecIApp {
  protected graphQLClient!: GraphQLClient;

  protected ipfsNode!: string;

  protected ipfsGateway!: string;

  protected defaultWorkerpool!: string;

  protected iexec!: IExec;

  private initPromise: Promise<void> | null = null;

  private ethProvider: EthersCompatibleProvider;

  private options: IAppConfigOptions;

  constructor(
    ethProvider?: EthersCompatibleProvider,
    options?: IAppConfigOptions
  ) {
    this.ethProvider = ethProvider || 'bellecour';
    this.options = options || {};
  }

  protected async init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.resolveConfig().then((config) => {
        this.ipfsNode = config.ipfsNode;
        this.ipfsGateway = config.ipfsGateway;
        this.defaultWorkerpool = config.defaultWorkerpool;
        this.iexec = config.iexec;
      });
    }
    return this.initPromise;
  }

  private async resolveConfig(): Promise<IExecIAppResolvedConfig> {
    const chainId = await getChainIdFromProvider(this.ethProvider);
    const chainDefaultConfig = getChainConfig(chainId, {
      allowExperimentalNetworks: this.options.allowExperimentalNetworks,
    });

    const subgraphUrl =
      this.options?.subgraphUrl || chainDefaultConfig?.subgraphUrl;

    const ipfsGateway =
      this.options?.ipfsGateway || chainDefaultConfig?.ipfsGateway;
    const defaultWorkerpool = chainDefaultConfig?.workerpoolAddress;
    const ipfsNode = this.options?.ipfsNode || chainDefaultConfig?.ipfsNode;

    const missing = [];
    if (!subgraphUrl) missing.push('subgraphUrl');
    if (!ipfsGateway) missing.push('ipfsGateway');
    if (!defaultWorkerpool) missing.push('defaultWorkerpool');
    if (!ipfsNode) missing.push('ipfsNode');

    if (missing.length > 0) {
      throw new Error(
        `Missing required configuration for chainId ${chainId}: ${missing.join(
          ', '
        )}`
      );
    }

    let iexec: IExec, graphQLClient: GraphQLClient;

    try {
      iexec = new IExec(
        { ethProvider: this.ethProvider },
        {
          ipfsGatewayURL: ipfsGateway,
          ...this.options?.iexecOptions,
          allowExperimentalNetworks: this.options.allowExperimentalNetworks,
        }
      );
    } catch (e: any) {
      throw new Error(`Unsupported ethProvider: ${e.message}`);
    }

    try {
      graphQLClient = new GraphQLClient(subgraphUrl);
    } catch (error: any) {
      throw new Error(`Failed to create GraphQLClient: ${error.message}`);
    }

    return {
      defaultWorkerpool,
      graphQLClient,
      ipfsNode,
      ipfsGateway,
      iexec,
    };
  }
}
