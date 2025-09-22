import { ChainId } from '../iapp/types.js';

export interface ChainConfig {
  name?: string;
  subgraphUrl?: string;
  ipfsGateway?: string;
  ipfsNode?: string;
  smsDebugURL?: string;
  workerpoolAddress?: string;
  isExperimental?: boolean;
}

const CHAIN_CONFIG: Record<ChainId, ChainConfig> = {
  // Bellecour
  134: {
    name: 'bellecour',
    subgraphUrl:
      'https://thegraph.iex.ec/subgraphs/name/bellecour/dataprotector-v2',
    ipfsGateway: 'https://ipfs-gateway.v8-bellecour.iex.ec',
    ipfsNode: 'https://ipfs-upload.v8-bellecour.iex.ec',
    smsDebugURL: 'https://sms-debug.iex.ec',
    workerpoolAddress: 'prod-v8-bellecour.main.pools.iexec.eth',
  },
  // Arbitrum Sepolia
  421614: {
    name: 'arbitrum-sepolia-testnet',
    subgraphUrl:
      'https://thegraph.arbitrum-sepolia-testnet.iex.ec/api/subgraphs/id/5YjRPLtjS6GH6bB4yY55Qg4HzwtRGQ8TaHtGf9UBWWd',
    ipfsGateway: 'https://ipfs-gateway.arbitrum-sepolia-testnet.iex.ec',
    ipfsNode: 'https://ipfs-upload.arbitrum-sepolia-testnet.iex.ec',
    smsDebugURL: 'https://sms.arbitrum-sepolia-testnet.iex.ec', // ⚠️ default SMS is a debug SMS
    workerpoolAddress: '0xB967057a21dc6A66A29721d96b8Aa7454B7c383F',
    isExperimental: true,
  },
  // Arbitrum Mainnet
  42161: {
    name: 'arbitrum-mainnet',
    subgraphUrl:
      'https://thegraph.arbitrum.iex.ec/api/subgraphs/id/Ep5zs5zVr4tDiVuQJepUu51e5eWYJpka624X4DMBxe3u',
    ipfsGateway: 'https://ipfs-gateway.arbitrum-mainnet.iex.ec',
    ipfsNode: 'https://ipfs-upload.arbitrum-mainnet.iex.ec',
    smsDebugURL: 'https://sms-debug.arbitrum-mainnet.iex.ec',
    workerpoolAddress: '0x2C06263943180Cc024dAFfeEe15612DB6e5fD248',
  },
};

export const getChainConfig = (
  chainId: ChainId,
  options?: { allowExperimentalNetworks?: boolean }
): ChainConfig => {
  const config = CHAIN_CONFIG[chainId] || {};
  if (config?.isExperimental && !options?.allowExperimentalNetworks) {
    return {};
  }
  return config;
};

export const DEFAULT_CHAIN_ID = 134;
