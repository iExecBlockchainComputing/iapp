export const CONFIG_FILE = 'iapp.config.json';
export const TEST_INPUT_DIR = 'input';
export const TEST_OUTPUT_DIR = 'output';
export const RUN_OUTPUT_DIR = 'output'; // Same as TEST_OUTPUT_DIR
export const CACHE_DIR = 'cache';
export const PROTECTED_DATA_MOCK_DIR = 'mock/protectedData';

export const IEXEC_OUT = '/iexec_out';
export const IEXEC_COMPUTED_JSON = 'computed.json';
export const IEXEC_DETERMINISTIC_OUTPUT_PATH_KEY = 'deterministic-output-path';
export const IEXEC_TDX_WORKER_HEAP_SIZE = 6 * 1024 * 1024 * 1024; // iExec TDX worker memory limit (6 GiB)
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

type ChainConfig = {
  rpcHostUrl: string;
  ipfsGatewayUrl: string;
  iexecExplorerUrl: string;
  tdxWorkerpool: string;
};

export const DEFAULT_CHAIN = 'arbitrum-sepolia-testnet';

export const DEPRECATED_CHAINS: string[] = [];

export const CHAINS_CONFIGURATIONS: Record<string, ChainConfig> = {
  'arbitrum-mainnet': {
    rpcHostUrl: 'https://arb1.arbitrum.io/rpc',
    ipfsGatewayUrl: 'https://ipfs-gateway.arbitrum-mainnet.iex.ec',
    iexecExplorerUrl: 'https://explorer.iex.ec/arbitrum-mainnet',
    tdxWorkerpool: '0x8ef2ec3ef9535d4b4349bfec7d8b31a580e60244',
  },
  'arbitrum-sepolia-testnet': {
    rpcHostUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    ipfsGatewayUrl: 'https://ipfs-gateway.arbitrum-sepolia-testnet.iex.ec',
    iexecExplorerUrl: 'https://explorer.iex.ec/arbitrum-sepolia-testnet',
    tdxWorkerpool: '0x2956f0cb779904795a5f30d3b3ea88b714c3123f',
  },
};

export const SUPPORTED_CHAINS = Object.keys(CHAINS_CONFIGURATIONS);
