import { GraphQLClient } from 'graphql-request';
import { Address, BN, IExec } from 'iexec';
import { IAppConfigOptions, Web3SignerProvider } from './index.js';
import { AbstractProvider, AbstractSigner, Eip1193Provider } from 'ethers';

export type EthersCompatibleProvider =
  | AbstractProvider
  | AbstractSigner
  | Eip1193Provider
  | Web3SignerProvider
  | string;

export type IExecConsumer = {
  iexec: IExec;
};

export type SubgraphConsumer = {
  graphQLClient: GraphQLClient;
};

export type VoucherInfo = {
  owner: Address;
  address: Address;
  type: BN;
  balance: BN;
  expirationTimestamp: BN;
  sponsoredApps: Address[];
  sponsoredDatasets: Address[];
  sponsoredWorkerpools: Address[];
  allowanceAmount: BN;
  authorizedAccounts: Address[];
};

export type DataProtectorConsumer = {
  ethProvider: EthersCompatibleProvider;
  options: IAppConfigOptions;
};
