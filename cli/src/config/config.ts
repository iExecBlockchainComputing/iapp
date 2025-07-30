import { useExperimentalNetworks } from '../utils/featureFlags.js';

export const SCONE_TAG = ['tee', 'scone'];
export const DEFAULT_SCONE_VERSION = 'v5.9';

export const SCONIFY_API_HTTP_URL = 'https://iapp-api.iex.ec';
export const SCONIFY_API_WS_URL = 'wss://iapp-api.iex.ec';

export const CONFIG_FILE = 'iapp.config.json';
export const TEST_INPUT_DIR = 'input';
export const TEST_OUTPUT_DIR = 'output';
export const RUN_OUTPUT_DIR = 'output'; // Same as TEST_OUTPUT_DIR
export const CACHE_DIR = 'cache';
export const PROTECTED_DATA_MOCK_DIR = 'mock/protectedData';

export const IEXEC_OUT = '/iexec_out';
export const IEXEC_COMPUTED_JSON = 'computed.json';
export const IEXEC_DETERMINISTIC_OUTPUT_PATH_KEY = 'deterministic-output-path';
export const IEXEC_WORKER_HEAP_SIZE = 1024 * 1024 * 1024; // iExec worker memory limit (1 GiB)
export const IEXEC_RESULT_UPLOAD_MAX_SIZE = 50 * 1024 * 1024; // Maximum allowed size for the result output (50 MiB)

export const TASK_OBSERVATION_TIMEOUT = 180000; // 3 minutes

export type TemplateName = 'JavaScript' | 'Python3.13';

/**
 * legacy templates name still supported by the API but dropped in the CLI
 */
export const LEGACY_TEMPLATE_NAMES = ['Python'];

export const TEMPLATES: Record<
  TemplateName,
  {
    /**
     * template title (as displayed in the CLI)
     */
    title: string;
    /**
     * list all files to adapt depending on used features on a given template
     */
    sourceFiles: string[];
    /**
     * main file where builder should start hacking
     */
    mainFile: string;
    /**
     * template proposed by default
     */
    default?: boolean;
  }
> = {
  JavaScript: {
    title: 'JavaScript',
    default: true,
    sourceFiles: ['src/app.js', 'package.json'],
    mainFile: 'src/app.js',
  },
  'Python3.13': {
    title: 'Python',
    sourceFiles: ['src/app.py', 'src/protected_data.py', 'requirements.txt'],
    mainFile: 'src/app.py',
  },
};

const WS_SERVER_SESSION_TIMEOUT = 60_000; // session retention after websocket close proposed by the API
export const WS_SERVER_HEARTBEAT_INTERVAL = 15_000; // heartbeat proposed by the API
export const WS_RECONNECTION_DELAY = 6_000;
export const WS_RECONNECTION_MAX_ATTEMPTS = Math.floor(
  WS_SERVER_SESSION_TIMEOUT / WS_RECONNECTION_DELAY
);

type ChainConfig = {
  rpcHostUrl: string;
  smsDebugUrl: string;
  ipfsGatewayUrl: string;
  iexecExplorerUrl: string;
  workerpoolDebug: string;
};

export const DEFAULT_CHAIN = 'bellecour';

export const CHAINS_CONFIGURATIONS: Record<string, ChainConfig> = {
  bellecour: {
    rpcHostUrl: 'https://bellecour.iex.ec',
    smsDebugUrl: 'https://sms.scone-debug.v8-bellecour.iex.ec',
    ipfsGatewayUrl: 'https://ipfs-gateway.v8-bellecour.iex.ec',
    iexecExplorerUrl: 'https://explorer.iex.ec/bellecour',
    workerpoolDebug: 'debug-v8-learn.main.pools.iexec.eth',
  },
  'arbitrum-mainnet': {
    rpcHostUrl: 'https://arb1.arbitrum.io/rpc',
    smsDebugUrl: 'https://sms-debug.arbitrum-mainnet.iex.ec',
    ipfsGatewayUrl: 'https://ipfs-gateway.arbitrum-mainnet.iex.ec',
    iexecExplorerUrl: 'https://explorer.iex.ec/arbitrum-mainnet',
    workerpoolDebug: 'TODO', // TODO: Update with actual debug workerpool address
  },
  ...(useExperimentalNetworks && {
    'arbitrum-sepolia-testnet': {
      rpcHostUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
      smsDebugUrl: 'https://sms.arbitrum-sepolia-testnet.iex.ec',
      ipfsGatewayUrl: 'https://ipfs-gateway.arbitrum-sepolia-testnet.iex.ec',
      iexecExplorerUrl: 'https://explorer.iex.ec/arbitrum-sepolia-testnet',
      workerpoolDebug: '0xB967057a21dc6A66A29721d96b8Aa7454B7c383F',
    },
  }),
};

export const SUPPORTED_CHAINS = Object.keys(CHAINS_CONFIGURATIONS);
